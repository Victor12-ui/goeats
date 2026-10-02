import { Request, Response, NextFunction } from "express";
import { prisma } from "../../config/database";
import { OrderType, OrderStatus, OrderItemStatus } from "@prisma/client";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { TokenPayload } from "../../middlewares/auth";

export async function getAllRestaurants(req: Request, res: Response, next: NextFunction) {
  try {
    const restaurants = await prisma.restaurant.findMany({
      include: {
        users: {
          select: { id: true, username: true, name: true, role: true },
        },
        issuer: true,
      },
    });

    return res.status(200).json({ success: true, restaurants });
  } catch (error) {
    next(error);
  }
}

export async function getRestaurantById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: "Invalid restaurant ID" });
    }

    // Tenant check: staff can only view their own restaurant
    if (req.user && req.user.role !== "SUPER_ADMIN" && req.user.restaurantId !== id) {
      return res.status(403).json({ success: false, message: "Forbidden: Access denied to this restaurant" });
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      include: {
        issuer: true,
        categories: true,
        subcategories: true,
      },
    });

    if (!restaurant) {
      return res.status(404).json({ success: false, message: "Restaurant not found" });
    }

    return res.status(200).json({ success: true, restaurant });
  } catch (error) {
    next(error);
  }
}

export async function updateRestaurant(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: "Invalid restaurant ID" });
    }

    // Tenant check
    if (req.user && req.user.role !== "SUPER_ADMIN" && req.user.restaurantId !== id) {
      return res.status(403).json({ success: false, message: "Forbidden: Access denied to this restaurant" });
    }

    const {
      name,
      logo,
      address,
      phone,
      wifiSsid,
      wifiPassword,
      qrOrderingEnabled,
      isActive,
      payphoneToken,
      bankAccountsJson,
      coverImage,
      description,
      mapLatitude,
      mapLongitude,
      mapIframe,
      reference,
      openingHours,
      faqsJson,
      categoryIds,
      subcategoryIds,
    } = req.body;

    const restaurant = await prisma.restaurant.update({
      where: { id },
      data: {
        name,
        logo,
        address,
        phone,
        wifiSsid,
        wifiPassword,
        qrOrderingEnabled,
        payphoneToken,
        bankAccountsJson,
        coverImage,
        description,
        mapLatitude: (mapLatitude !== undefined && mapLatitude !== null && mapLatitude !== "") ? parseFloat(mapLatitude) : null,
        mapLongitude: (mapLongitude !== undefined && mapLongitude !== null && mapLongitude !== "") ? parseFloat(mapLongitude) : null,
        mapIframe,
        reference,
        openingHours,
        faqsJson,
        categories: categoryIds ? { set: categoryIds.map((cid: number) => ({ id: cid })) } : undefined,
        subcategories: subcategoryIds ? { set: subcategoryIds.map((sid: number) => ({ id: sid })) } : undefined,
        isActive: req.user?.role === "SUPER_ADMIN" ? isActive : undefined, // Only SuperAdmin can activate/deactivate
      },
    });

    return res.status(200).json({
      success: true,
      message: "Restaurant configuration updated successfully",
      restaurant,
    });
  } catch (error) {
    next(error);
  }
}

export async function getPublicRestaurantCatalog(req: Request, res: Response, next: NextFunction) {
  try {
    const { slug } = req.params;
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: slug.toLowerCase().trim(), isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        address: true,
        phone: true,
        wifiSsid: true,
        wifiPassword: true,
        qrOrderingEnabled: true,
        payphoneToken: true,
        bankAccountsJson: true,
        coverImage: true,
        description: true,
        mapLatitude: true,
        mapLongitude: true,
        mapIframe: true,
        reference: true,
        openingHours: true,
        faqsJson: true,
        categories: {
          select: { id: true, name: true }
        },
        subcategories: {
          select: { id: true, name: true }
        }
      },
    });

    if (!restaurant) {
      return res.status(404).json({ success: false, message: "Restaurant not found or inactive" });
    }

    // Load active dining areas & tables
    const diningAreas = await prisma.diningArea.findMany({
      where: { restaurantId: restaurant.id },
      include: {
        tables: {
          select: { id: true, number: true, status: true },
        },
      },
    });

    // Load menu categories and items (excluding recipes & internal cost detail)
    const menuCategories = await prisma.menuCategory.findMany({
      where: { restaurantId: restaurant.id },
      include: {
        items: {
          include: {
            variants: {
              select: { id: true, name: true, price: true, stockLimit: true, options: true },
            },
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      restaurant,
      diningAreas,
      menuCategories,
    });
  } catch (error) {
    next(error);
  }
}

export async function getPublicRestaurantList(req: Request, res: Response, next: NextFunction) {
  try {
    const restaurants = await prisma.restaurant.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        coverImage: true,
        description: true,
        address: true,
        phone: true,
        categories: {
          select: { id: true, name: true }
        },
        subcategories: {
          select: { id: true, name: true }
        }
      },
    });

    return res.status(200).json({ success: true, restaurants });
  } catch (error) {
    next(error);
  }
}

export async function createPublicOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const { slug } = req.params;
    const { 
      type, 
      tableId, 
      customerName, 
      comments, 
      items, 
      deliveryAddress, 
      deliveryPhone, 
      deliveryLat, 
      deliveryLng, 
      shippingCost, 
      paymentMethod, 
      paymentReceipt, 
      payphoneTransactionId 
    } = req.body;

    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: slug.toLowerCase().trim(), isActive: true }
    });

    if (!restaurant) {
      return res.status(404).json({ success: false, message: "Restaurant not found or inactive" });
    }

    if (!type || !customerName || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Type, customerName, and non-empty items are required" });
    }

    // Convert type string to enum if it matches
    const typeEnum = type === "DINE_IN" ? OrderType.DINE_IN : (type === "TAKEOUT" ? OrderType.TAKEOUT : OrderType.DELIVERY);

    if (typeEnum === OrderType.DINE_IN) {
      if (!restaurant.qrOrderingEnabled) {
        return res.status(400).json({ success: false, message: "Dine-in QR ordering is disabled for this restaurant" });
      }
      if (!tableId) {
        return res.status(400).json({ success: false, message: "Table ID is required for dine-in orders" });
      }
    }

    let initialStatus: OrderStatus = OrderStatus.PENDING;
    let finalPaymentStatus = "PENDING";

    if (typeEnum === OrderType.DINE_IN) {
      initialStatus = OrderStatus.PREPARING;
    } else {
      const method = paymentMethod || "CASH";
      if (method === "CASH" || method === "CARD") {
        initialStatus = OrderStatus.PREPARING;
        if (method === "CARD") {
          finalPaymentStatus = "APPROVED";
        }
      } else if (method === "TRANSFER") {
        initialStatus = OrderStatus.PENDING;
        finalPaymentStatus = "PENDING";
      }
    }

    // Optional customer token check
    let customerId: number | null = null;
    let isPlusClient = false;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
        customerId = decoded.userId;
        
        const orderingUser = await prisma.user.findUnique({
          where: { id: customerId }
        });
        if (orderingUser && orderingUser.isPlus) {
          isPlusClient = true;
        }
      } catch (err) {
        // ignore invalid token
      }
    }

    // Run transaction
    const order = await prisma.$transaction(async (tx) => {
      let calculatedTotal = 0;
      const orderItemsData = [];

      for (const item of items) {
        const variantId = parseInt(item.variantId, 10);
        const quantity = parseFloat(item.quantity);

        const variant = await tx.menuItemVariant.findFirst({
          where: { id: variantId, menuItem: { category: { restaurantId: restaurant.id } } },
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

      // Dine-in table handling
      if (typeEnum === OrderType.DINE_IN && tableId) {
        const parsedTableId = parseInt(tableId, 10);
        const table = await tx.table.findFirst({
          where: { id: parsedTableId, diningArea: { restaurantId: restaurant.id } },
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

      // Create the order
      const costEnvio = (typeEnum === OrderType.DELIVERY && !isPlusClient) ? parseFloat(shippingCost || 0) : 0;
      const newOrder = await tx.order.create({
        data: {
          type: typeEnum,
          status: initialStatus,
          tableId: typeEnum === OrderType.DINE_IN && tableId ? parseInt(tableId, 10) : null,
          mozoId: null, // public order has no waiter
          customerId: customerId, // link to customer if authenticated
          customerName,
          comments,
          shippingCost: costEnvio,
          total: calculatedTotal + costEnvio,
          deliveryAddress: typeEnum === OrderType.DELIVERY ? deliveryAddress : null,
          deliveryPhone: typeEnum === OrderType.DELIVERY ? deliveryPhone : null,
          deliveryLat: (typeEnum === OrderType.DELIVERY && deliveryLat) ? parseFloat(deliveryLat) : null,
          deliveryLng: (typeEnum === OrderType.DELIVERY && deliveryLng) ? parseFloat(deliveryLng) : null,
          restaurantId: restaurant.id,
          paymentMethodString: paymentMethod || "CASH",
          paymentReceipt: paymentReceipt || null,
          paymentStatus: finalPaymentStatus,
          payphoneTransactionId: payphoneTransactionId || null,
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
          customer: {
            select: { id: true, name: true, role: true, isPlus: true },
          },
        },
      });

      return newOrder;
    });

    // Send real-time Socket notification to kitchen and cashiers
    const io = req.app.get("io");
    if (io) {
      io.to(`restaurant-${restaurant.id}`).emit("new-order", order);
      console.log(`[Socket] Emitted public new-order for restaurant-${restaurant.id}`);
    }

    return res.status(201).json({ success: true, message: "Public order created successfully", order });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message || "Failed to create order" });
  }
}
