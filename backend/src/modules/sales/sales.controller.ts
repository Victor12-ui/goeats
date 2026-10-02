import { Request, Response, NextFunction } from "express";
import { prisma } from "../../config/database";
import { OrderStatus, OrderType } from "@prisma/client";
import { emitElectronicInvoice } from "../../services/sri/sri-billing.service";

export async function emitSale(req: Request, res: Response, next: NextFunction) {
  try {
    const restaurantId = req.restaurantId;
    const userId = req.user?.userId;

    if (!restaurantId || !userId) {
      return res.status(400).json({ success: false, message: "Restaurant context and user auth required" });
    }

    const {
      orderId,
      clientId,
      clientData, // Optional: { name, typeId, identification, address, email, phone }
      paymentCash,
      paymentCard,
      discount,
      paymentMethod, // "01" (cash), "20" (card)
      docTypeId, // ID from DocumentType model
      fiscalEmit, // boolean: emit electronic invoice
    } = req.body;

    if (!orderId || !docTypeId || !paymentMethod) {
      return res.status(400).json({ success: false, message: "orderId, docTypeId, and paymentMethod are required" });
    }

    // 1. Verify restaurant has an active open cash session
    let cashSession = await prisma.cashSession.findFirst({
      where: { userId, status: "OPEN", cashRegister: { restaurantId } },
    });
    if (!cashSession) {
      cashSession = await prisma.cashSession.findFirst({
        where: { status: "OPEN", cashRegister: { restaurantId } },
        orderBy: { openTime: "desc" },
      });
    }
    if (!cashSession) {
      return res.status(400).json({ success: false, message: "Debe haber una sesión de caja abierta en el restaurante antes de emitir ventas" });
    }

    // 2. Load order and items
    const order = await prisma.order.findFirst({
      where: { id: parseInt(orderId, 10), restaurantId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                recipeIngredients: true,
                menuItem: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.status === OrderStatus.DELIVERED) {
      return res.status(400).json({ success: false, message: "This order has already been closed/paid" });
    }

    // 3. Load or create Client
    let finalClientId: number;

    if (clientId) {
      const client = await prisma.client.findFirst({
        where: { id: parseInt(clientId, 10), restaurantId },
      });
      if (!client) {
        return res.status(404).json({ success: false, message: "Specified client not found" });
      }
      finalClientId = client.id;
    } else if (clientData) {
      // Find if client already exists by identification in this restaurant
      const existingClient = await prisma.client.findFirst({
        where: { identification: clientData.identification, restaurantId },
      });

      if (existingClient) {
        finalClientId = existingClient.id;
      } else {
        const newClient = await prisma.client.create({
          data: {
            name: clientData.name,
            typeId: clientData.typeId,
            identification: clientData.identification,
            address: clientData.address || "S/N",
            email: clientData.email || "consumidorfinal@gmail.com",
            phone: clientData.phone || "0999999999",
            restaurantId,
          },
        });
        finalClientId = newClient.id;
      }
    } else {
      // Default to Consumidor Final
      const cfClient = await prisma.client.findFirst({
        where: { identification: "9999999999999", restaurantId },
      });

      if (cfClient) {
        finalClientId = cfClient.id;
      } else {
        const newCf = await prisma.client.create({
          data: {
            name: "CONSUMIDOR FINAL",
            typeId: "07",
            identification: "9999999999999",
            address: "S/N",
            email: "cf@gmail.com",
            phone: "0999999999",
            restaurantId,
          },
        });
        finalClientId = newCf.id;
      }
    }

    // 4. Verify Document Type exists
    const docType = await prisma.documentType.findUnique({
      where: { id: parseInt(docTypeId, 10) },
    });
    if (!docType) {
      return res.status(404).json({ success: false, message: "Document type not found" });
    }

    // 5. Load issuer to build doc serial and next sequential
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: { issuer: true },
    });
    if (!restaurant?.issuer) {
      return res.status(400).json({ success: false, message: "Restaurant does not have billing issuer config" });
    }

    const issuer = restaurant.issuer;
    const serialDoc = `${issuer.establecimiento}-${issuer.puntoEmision}`;

    // Get the next sequential number
    const lastSale = await prisma.sale.findFirst({
      where: { restaurantId, docTypeId: docType.id },
      orderBy: { id: "desc" },
    });

    let nextNumber = 1;
    if (lastSale) {
      nextNumber = parseInt(lastSale.numberDoc, 10) + 1;
    } else {
      nextNumber = parseInt(issuer.startSecuencial, 10);
    }
    const numberDoc = nextNumber.toString().padStart(9, "0");

    // 6. Calculate subtotal & tax totals
    const disc = parseFloat(discount || 0);
    const taxRate = 12.0; // standard IVA in Ecuador (can be updated to 15.0 if needed)
    
    // In GoEats: We assume prices include tax, or exclude tax.
    // Let's assume prices in Menu items already include tax, so we calculate backward.
    // Price = Subtotal + Tax
    // Subtotal = Price / (1 + TaxRate/100)
    // Tax = Price - Subtotal
    let subtotalTaxTotal = 0;
    let subtotal0Total = 0;
    let taxValueTotal = 0;

    for (const item of order.items) {
      const isTaxable = item.variant.menuItem.productionAreaId !== null; // Cocina/Bar products are taxable, grocery/other might be 0%
      const itemTotal = item.price * item.quantity;

      if (isTaxable) {
        const subtotal = itemTotal / (1 + taxRate / 100);
        const tax = itemTotal - subtotal;
        subtotalTaxTotal += subtotal;
        taxValueTotal += tax;
      } else {
        subtotal0Total += itemTotal;
      }
    }

    const saleTotal = subtotalTaxTotal + subtotal0Total + taxValueTotal - disc;

    // 7. Execute Transaction: inventory deduction + sale + order update
    const sale = await prisma.$transaction(async (tx) => {
      // A. Inventory deduction based on recipe
      for (const item of order.items) {
        for (const recipe of item.variant.recipeIngredients) {
          const totalDeduction = recipe.quantity * item.quantity;

          // Decrement Supply stock
          await tx.supply.update({
            where: { id: recipe.supplyId },
            data: {
              stock: {
                decrement: totalDeduction,
              },
            },
          });

          // Create inventory movement record
          await tx.inventoryMovement.create({
            data: {
              supplyId: recipe.supplyId,
              type: "OUT",
              quantity: totalDeduction,
              reason: "VENTA",
              costUnit: 0.0, // Can link cost from supply later
            },
          });
        }
      }

      // B. Create Sale
      const newSale = await tx.sale.create({
        data: {
          orderId: order.id,
          clientId: finalClientId,
          docTypeId: docType.id,
          cashSessionId: cashSession.id,
          serialDoc,
          numberDoc,
          paymentCash: parseFloat(paymentCash || 0),
          paymentCard: parseFloat(paymentCard || 0),
          discount: disc,
          taxRate,
          subtotal0: subtotal0Total,
          subtotalTax: subtotalTaxTotal,
          taxValue: taxValueTotal,
          total: saleTotal,
          paymentMethod,
          restaurantId,
        },
      });

      // C. Update Order status
      // If delivery or takeout and currently PENDING, it goes to kitchen (PREPARING).
      // If it already has an active kitchen status (PREPARING, READY, DELIVERING), keep it.
      // If dine-in, orders are paid after consumption, so we set them to DELIVERED (closed).
      let targetStatus = order.status;
      if (order.type === OrderType.DINE_IN) {
        targetStatus = OrderStatus.DELIVERED;
      } else if (order.status === OrderStatus.PENDING) {
        targetStatus = OrderStatus.PREPARING;
      }

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: targetStatus,
          paymentStatus: "APPROVED"
        },
      });

      // D. Free table if dine-in
      if (order.type === OrderType.DINE_IN && order.tableId) {
        await tx.table.update({
          where: { id: order.tableId },
          data: { status: "FREE" },
        });
      }

      return newSale;
    });

    // Notify real-time clients (POS) that order is finalized and table is free
    const io = req.app.get("io");
    if (io) {
      io.to(`restaurant-${restaurantId}`).emit("sale-emitted", {
        sale,
        orderId: order.id,
        tableId: order.tableId,
      });
    }

    // 8. Electronic Invoice emission
    let fiscalResult = null;
    if (docType.code === "01" && fiscalEmit) {
      console.log(`[Billing] Emitting electronic invoice for sale ${sale.id}...`);
      fiscalResult = await emitElectronicInvoice(sale.id);
    }

    return res.status(201).json({
      success: true,
      message: "Sale processed successfully",
      sale,
      fiscal: fiscalResult,
    });
  } catch (error: any) {
    next(error);
  }
}

export async function getSales(req: Request, res: Response, next: NextFunction) {
  try {
    const restaurantId = req.restaurantId;
    if (!restaurantId) {
      return res.status(400).json({ success: false, message: "Restaurant context is required" });
    }

    const sales = await prisma.sale.findMany({
      where: { restaurantId },
      include: {
        order: true,
        client: true,
        docType: true,
        invoice: {
          select: { id: true, estado: true, claveAcceso: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({ success: true, sales });
  } catch (error) {
    next(error);
  }
}

export async function getSaleById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    const restaurantId = req.restaurantId;

    if (isNaN(id) || !restaurantId) {
      return res.status(400).json({ success: false, message: "Invalid ID or restaurant context missing" });
    }

    const sale = await prisma.sale.findFirst({
      where: { id, restaurantId },
      include: {
        order: {
          include: {
            items: {
              include: {
                variant: {
                  include: { menuItem: true },
                },
              },
            },
            table: true,
            mozo: { select: { name: true } },
          },
        },
        client: true,
        docType: true,
        invoice: true,
      },
    });

    if (!sale) {
      return res.status(404).json({ success: false, message: "Sale not found" });
    }

    return res.status(200).json({ success: true, sale });
  } catch (error) {
    next(error);
  }
}

export async function getInvoicePdf(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    const restaurantId = req.restaurantId;

    if (isNaN(id) || !restaurantId) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id, sale: { restaurantId } },
    });

    if (!invoice || !invoice.pdfRIDE) {
      return res.status(404).json({ success: false, message: "RIDE PDF representation not found for this invoice" });
    }

    const pdfBuffer = Buffer.from(invoice.pdfRIDE, "base64");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=Factura_${invoice.secuencial}.pdf`);
    return res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
}

export async function retryBilling(req: Request, res: Response, next: NextFunction) {
  try {
    const saleId = parseInt(req.params.id, 10);
    const restaurantId = req.restaurantId;

    if (isNaN(saleId) || !restaurantId) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }

    const sale = await prisma.sale.findFirst({
      where: { id: saleId, restaurantId },
      include: { invoice: true },
    });

    if (!sale) {
      return res.status(404).json({ success: false, message: "Sale not found" });
    }

    // If an invoice exists and is already authorized, don't retry
    if (sale.invoice && sale.invoice.estado === "AUTORIZADA") {
      return res.status(400).json({ success: false, message: "Invoice is already successfully authorized by SRI" });
    }

    // Delete failed/stale invoice record first to avoid double entries
    if (sale.invoice) {
      await prisma.invoice.delete({ where: { id: sale.invoice.id } });
    }

    console.log(`[Billing] Retrying electronic invoice for sale ${sale.id}...`);
    const fiscalResult = await emitElectronicInvoice(sale.id);

    return res.status(200).json({
      success: fiscalResult.success,
      message: fiscalResult.success ? "Invoice processed successfully" : "Invoice failed",
      fiscal: fiscalResult,
    });
  } catch (error) {
    next(error);
  }
}
