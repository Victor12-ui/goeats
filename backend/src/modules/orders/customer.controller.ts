import { Request, Response, NextFunction } from "express";
import { prisma } from "../../config/database";

// 1. Get order history for the logged-in customer
export async function getMyOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const orders = await prisma.order.findMany({
      where: { customerId: userId },
      orderBy: { createdAt: "desc" },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            address: true,
            phone: true,
            mapLatitude: true,
            mapLongitude: true,
          },
        },
        items: {
          include: {
            variant: {
              include: {
                menuItem: true,
              },
            },
          },
        },
        table: {
          select: {
            id: true,
            number: true,
          },
        },
        deliveryDriver: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    return res.status(200).json({ success: true, orders });
  } catch (error) {
    next(error);
  }
}

// 2. Get stats for the customer
export async function getCustomerStats(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Get all non-cancelled orders for stats
    const orders = await prisma.order.findMany({
      where: {
        customerId: userId,
        status: { not: "CANCELLED" },
      },
      select: {
        total: true,
        restaurantId: true,
        restaurant: {
          select: {
            name: true,
          },
        },
      },
    });

    const totalOrders = orders.length;
    const totalSpent = orders.reduce((sum, o) => sum + o.total, 0);

    // Calculate favorite restaurant
    const restCounts: Record<number, { count: number; name: string }> = {};
    orders.forEach((o) => {
      if (!restCounts[o.restaurantId]) {
        restCounts[o.restaurantId] = { count: 0, name: o.restaurant.name };
      }
      restCounts[o.restaurantId].count++;
    });

    let favoriteRestaurant = "Ninguno";
    let maxCount = 0;
    for (const key in restCounts) {
      if (restCounts[key].count > maxCount) {
        maxCount = restCounts[key].count;
        favoriteRestaurant = restCounts[key].name;
      }
    }

    return res.status(200).json({
      success: true,
      stats: {
        totalOrders,
        totalSpent: parseFloat(totalSpent.toFixed(2)),
        favoriteRestaurant,
      },
    });
  } catch (error) {
    next(error);
  }
}

// 3. Toggle GoEats Plus subscription status
export async function togglePlusSubscription(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "Usuario no encontrado" });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isPlus: !user.isPlus },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        isPlus: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: updatedUser.isPlus
        ? "Te has suscrito con éxito a GoEats Plus. ¡Disfruta de envíos gratis!"
        : "Has cancelado tu suscripción a GoEats Plus.",
      isPlus: updatedUser.isPlus,
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
}
