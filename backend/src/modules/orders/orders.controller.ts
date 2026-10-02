import { Request, Response, NextFunction } from "express";
import { prisma } from "../../config/database";
import { OrderType, OrderStatus, OrderItemStatus } from "@prisma/client";

export async function createOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const restaurantId = req.restaurantId;
    const userId = req.user?.userId;

    if (!restaurantId || !userId) {
      return res.status(400).json({ success: false, message: "Restaurant context and user auth required" });
    }

    const { type, tableId, customerName, comments, items, deliveryAddress, deliveryPhone, shippingCost } = req.body;

    if (!type || !customerName || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Type, customerName, and non-empty items are required" });
    }

    if (!Object.values(OrderType).includes(type)) {
      return res.status(400).json({ success: false, message: "Invalid order type" });
    }

    // Run transaction
    const order = await prisma.$transaction(async (tx) => {
      // 1. Calculate total and validate items
      let calculatedTotal = 0;
      const orderItemsData = [];

      for (const item of items) {
        const variantId = parseInt(item.variantId, 10);
        const quantity = parseFloat(item.quantity);

        const variant = await tx.menuItemVariant.findFirst({
          where: { id: variantId, menuItem: { category: { restaurantId } } },
        });

        if (!variant) {
          throw new Error(`Variant ID ${variantId} not found in this restaurant`);
        }

        const price = variant.price;
        const subtotal = price * quantity;
        calculatedTotal += subtotal;

        orderItemsData.push({
          variantId,
          quantity,
          price,
          comments: item.comments || null,
          status: OrderItemStatus.PENDING,
        });
      }

      // 2. Dine-in table handling
      if (type === OrderType.DINE_IN && tableId) {
        const parsedTableId = parseInt(tableId, 10);
        const table = await tx.table.findFirst({
          where: { id: parsedTableId, diningArea: { restaurantId } },
        });

        if (!table) {
          throw new Error(`Table ID ${parsedTableId} not found`);
        }

        // Set table status to occupied
        await tx.table.update({
          where: { id: parsedTableId },
          data: { status: "OCCUPIED" },
        });
      }

      // 3. Create the order
      const costEnvio = type === OrderType.DELIVERY ? parseFloat(shippingCost || 0) : 0;
      const newOrder = await tx.order.create({
        data: {
          type,
          status: OrderStatus.PREPARING,
          tableId: type === OrderType.DINE_IN && tableId ? parseInt(tableId, 10) : null,
          mozoId: userId,
          customerName,
          comments,
          shippingCost: costEnvio,
          total: calculatedTotal + costEnvio,
          deliveryAddress: type === OrderType.DELIVERY ? deliveryAddress : null,
          deliveryPhone: type === OrderType.DELIVERY ? deliveryPhone : null,
          restaurantId,
          items: {
            create: orderItemsData,
          },
        },
        include: {
          items: {
            include: {
              variant: {
                include: { menuItem: true },
              },
            },
          },
          table: true,
          mozo: {
            select: { id: true, name: true, role: true },
          },
        },
      });

      return newOrder;
    });

    // Send real-time Socket notification to kitchen and cashiers
    const io = req.app.get("io");
    if (io) {
      io.to(`restaurant-${restaurantId}`).emit("new-order", order);
      console.log(`[Socket] Emitted new-order for restaurant-${restaurantId}`);
    }

    return res.status(201).json({ success: true, message: "Order created successfully", order });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message || "Failed to create order" });
  }
}

export async function getOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const restaurantId = req.restaurantId;
    const { status, type } = req.query;

    if (!restaurantId) {
      return res.status(400).json({ success: false, message: "Restaurant context is required" });
    }

    const orders = await prisma.order.findMany({
      where: {
        restaurantId,
        status: status ? (status as OrderStatus) : undefined,
        type: type ? (type as OrderType) : undefined,
      },
      include: {
        items: {
          include: {
            variant: {
              include: { menuItem: true },
            },
          },
        },
        table: true,
        mozo: {
          select: { id: true, name: true, role: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({ success: true, orders });
  } catch (error) {
    next(error);
  }
}

export async function getOrderById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    const restaurantId = req.restaurantId;

    if (isNaN(id) || !restaurantId) {
      return res.status(400).json({ success: false, message: "Invalid ID or restaurant context missing" });
    }

    const order = await prisma.order.findFirst({
      where: { id, restaurantId },
      include: {
        items: {
          include: {
            variant: {
              include: { menuItem: true },
            },
          },
        },
        table: true,
        mozo: {
          select: { id: true, name: true, role: true },
        },
        sale: true,
      },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    return res.status(200).json({ success: true, order });
  } catch (error) {
    next(error);
  }
}

export async function updateOrderStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    const restaurantId = req.restaurantId;
    const { status, paymentStatus } = req.body;

    if (isNaN(id) || !restaurantId || !status) {
      return res.status(400).json({ success: false, message: "Invalid inputs" });
    }

    if (!Object.values(OrderStatus).includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status value" });
    }

    const order = await prisma.order.findFirst({ where: { id, restaurantId } });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const updateData: any = { status };
    if (paymentStatus) {
      updateData.paymentStatus = paymentStatus;
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        items: {
          include: {
            variant: {
              include: { menuItem: true },
            },
          },
        },
        table: true,
      },
    });

    // Notify kitchen/front-desk
    const io = req.app.get("io");
    if (io) {
      io.to(`restaurant-${restaurantId}`).emit("order-status-updated", updatedOrder);
    }

    return res.status(200).json({ success: true, message: `Order status updated to ${status}`, order: updatedOrder });
  } catch (error) {
    next(error);
  }
}

export async function changeTable(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    const restaurantId = req.restaurantId;
    const { newTableId } = req.body;

    if (isNaN(id) || !restaurantId || !newTableId) {
      return res.status(400).json({ success: false, message: "Invalid inputs" });
    }

    const parsedNewTableId = parseInt(newTableId, 10);

    const order = await prisma.order.findFirst({
      where: { id, restaurantId, type: OrderType.DINE_IN },
      include: { table: true },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: "Active DINE_IN order not found" });
    }

    const newTable = await prisma.table.findFirst({
      where: { id: parsedNewTableId, diningArea: { restaurantId } },
    });

    if (!newTable) {
      return res.status(404).json({ success: false, message: "New table not found in this restaurant" });
    }

    if (newTable.status === "OCCUPIED" && order.tableId !== parsedNewTableId) {
      return res.status(400).json({ success: false, message: "New table is already occupied" });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Free old table
      if (order.tableId) {
        await tx.table.update({
          where: { id: order.tableId },
          data: { status: "FREE" },
        });
      }

      // 2. Occupy new table
      await tx.table.update({
        where: { id: parsedNewTableId },
        data: { status: "OCCUPIED" },
      });

      // 3. Update order tableId
      await tx.order.update({
        where: { id },
        data: { tableId: parsedNewTableId },
      });
    });

    // Get fresh data
    const updatedOrder = await prisma.order.findUnique({
      where: { id },
      include: { table: true, items: true },
    });

    const io = req.app.get("io");
    if (io) {
      io.to(`restaurant-${restaurantId}`).emit("order-table-changed", updatedOrder);
    }

    return res.status(200).json({ success: true, message: "Table changed successfully", order: updatedOrder });
  } catch (error) {
    next(error);
  }
}

export async function cancelOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    const restaurantId = req.restaurantId;

    if (isNaN(id) || !restaurantId) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }

    const order = await prisma.order.findFirst({ where: { id, restaurantId } });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.status === OrderStatus.DELIVERED) {
      return res.status(400).json({ success: false, message: "Cannot cancel a delivered order" });
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      // 1. Free table if dine-in
      if (order.type === OrderType.DINE_IN && order.tableId) {
        await tx.table.update({
          where: { id: order.tableId },
          data: { status: "FREE" },
        });
      }

      // 2. Set order status to CANCELLED
      return await tx.order.update({
        where: { id },
        data: { status: OrderStatus.CANCELLED },
        include: { table: true },
      });
    });

    const io = req.app.get("io");
    if (io) {
      io.to(`restaurant-${restaurantId}`).emit("order-cancelled", updatedOrder);
    }

    return res.status(200).json({ success: true, message: "Order cancelled successfully", order: updatedOrder });
  } catch (error) {
    next(error);
  }
}

export async function updateOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    const restaurantId = req.restaurantId;

    if (isNaN(id) || !restaurantId) {
      return res.status(400).json({ success: false, message: "Invalid ID or restaurant context missing" });
    }

    const { items, customerName, comments } = req.body;

    if (!Array.isArray(items)) {
      return res.status(400).json({ success: false, message: "Items array is required" });
    }

    const existingOrder = await prisma.order.findFirst({
      where: { id, restaurantId },
    });

    if (!existingOrder) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      // 1. Delete existing items
      await tx.orderItem.deleteMany({
        where: { orderId: id },
      });

      // 2. Calculate new total and validate/create new items
      let calculatedTotal = 0;
      const orderItemsData = [];

      for (const item of items) {
        const variantId = parseInt(item.variantId, 10);
        const quantity = parseFloat(item.quantity);

        const variant = await tx.menuItemVariant.findFirst({
          where: { id: variantId, menuItem: { category: { restaurantId } } },
        });

        if (!variant) {
          throw new Error(`Variant ID ${variantId} not found in this restaurant`);
        }

        const price = variant.price;
        const subtotal = price * quantity;
        calculatedTotal += subtotal;

        orderItemsData.push({
          variantId,
          quantity,
          price,
          comments: item.comments || null,
          status: OrderItemStatus.PENDING,
        });
      }

      const costEnvio = existingOrder.shippingCost || 0;

      // 3. Update order
      return await tx.order.update({
        where: { id },
        data: {
          customerName: customerName || existingOrder.customerName,
          comments: comments !== undefined ? comments : existingOrder.comments,
          total: calculatedTotal + costEnvio,
          items: {
            create: orderItemsData,
          },
        },
        include: {
          items: {
            include: {
              variant: {
                include: { menuItem: true },
              },
            },
          },
          table: true,
          mozo: {
            select: { id: true, name: true, role: true },
          },
        },
      });
    });

    // Send real-time Socket notification to kitchen and cashiers
    const io = req.app.get("io");
    if (io) {
      io.to(`restaurant-${restaurantId}`).emit("order-status-updated", updatedOrder);
      console.log(`[Socket] Emitted order-status-updated for restaurant-${restaurantId}`);
    }

    return res.status(200).json({ success: true, message: "Order updated successfully", order: updatedOrder });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message || "Failed to update order" });
  }
}
