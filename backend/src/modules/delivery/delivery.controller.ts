import { Request, Response, NextFunction } from "express";
import { prisma } from "../../config/database";
import { OrderStatus, Role } from "@prisma/client";

// Get active config or default fallback values
async function getActiveDeliveryRate() {
  let rate = await prisma.deliveryRate.findFirst({
    where: { isActive: true },
  });

  if (!rate) {
    // Seed one dynamically if none exists
    rate = await prisma.deliveryRate.create({
      data: {
        name: "Tarifa Estándar GoEats",
        basePrice: 1.0,
        pricePerKm: 0.5,
        costPerOrder: 0.5,
        plusDriverBonus: 0.50,
        isActive: true,
      },
    });
  }
  return rate;
}

// 1. List ready orders available for any delivery driver
export async function getAvailableOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const orders = await prisma.order.findMany({
      where: {
        type: "DELIVERY",
        status: {
          in: [OrderStatus.PENDING, OrderStatus.PREPARING, OrderStatus.READY],
        },
        deliveryDriverId: null,
      },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            mapLatitude: true,
            mapLongitude: true,
            deliveryCommissionPercentage: true,
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
      },
      orderBy: { updatedAt: "asc" },
    });

    const rate = await getActiveDeliveryRate();

    // Map orders with Zaymi financial breakdown
    const enrichedOrders = orders.map((order) => {
      const commissionPct = order.restaurant?.deliveryCommissionPercentage ?? 10.0;
      const foodSubtotal = Math.max(0, order.total - (order.shippingCost || 0));
      const appCommission = parseFloat(((foodSubtotal * commissionPct) / 100).toFixed(2));
      const providerPay = parseFloat((foodSubtotal - appCommission).toFixed(2));
      const bonus = rate.plusDriverBonus || 0.10;
      const driverEarnings = parseFloat(((order.shippingCost || 0) + bonus).toFixed(2));

      return {
        ...order,
        financialBreakdown: {
          foodSubtotal,
          commissionPct,
          appCommissionFromProvider: appCommission,
          providerPayAmount: providerPay,
          driverBonus: bonus,
          driverEarnings,
          customerTotal: order.total,
        },
      };
    });

    return res.status(200).json({ success: true, orders: enrichedOrders, rate });
  } catch (error) {
    next(error);
  }
}

// 2. Take/Accept an order
export async function takeOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const orderId = parseInt(req.params.id, 10);
    const userId = req.user?.userId;

    if (isNaN(orderId) || !userId) {
      return res.status(400).json({ success: false, message: "Invalid parameters" });
    }

    // Load driver
    const driver = await prisma.user.findUnique({ where: { id: userId } });
    if (!driver || driver.role !== Role.MOTORIZADO) {
      return res.status(403).json({ success: false, message: "Only delivery drivers can accept orders" });
    }

    // Verify order is still available
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        status: {
          in: [OrderStatus.PENDING, OrderStatus.PREPARING, OrderStatus.READY],
        },
        deliveryDriverId: null,
      },
      include: {
        customer: true,
        restaurant: true,
      },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: "El pedido ya no está disponible o ya fue tomado" });
    }

    const isPlusOrder = order.customer?.isPlus === true;
    const isCashOrder = (order.paymentMethodString || "CASH") === "CASH";

    // Antifraude: Si el balance de deuda acumulado excede el límite (default $50.00), no permitir pedidos en efectivo
    const maxDebtAllowed = driver.maxDebtLimit ?? 50.0;
    if (isCashOrder && driver.walletBalance <= -maxDebtAllowed) {
      return res.status(400).json({
        success: false,
        message: `Has alcanzado tu límite máximo de deuda permitido (-$${maxDebtAllowed.toFixed(2)}). Por favor recarga o realiza un abono a GoEats para volver a tomar pedidos en efectivo.`,
      });
    }

    // Load active delivery rate configuration
    const rate = await getActiveDeliveryRate();

    // Check wallet balance ONLY if not GoEats Plus order
    if (!isPlusOrder && driver.walletBalance < rate.costPerOrder) {
      return res.status(400).json({
        success: false,
        message: `Saldo insuficiente en tu billetera. Necesitas al menos $${rate.costPerOrder.toFixed(2)} para tomar este pedido. Por favor recarga.`,
      });
    }

    // Calculate Zaymi breakdown
    const commissionPct = order.restaurant?.deliveryCommissionPercentage ?? 10.0;
    const foodSubtotal = Math.max(0, order.total - (order.shippingCost || 0));
    const appCommission = parseFloat(((foodSubtotal * commissionPct) / 100).toFixed(2));
    const providerPay = parseFloat((foodSubtotal - appCommission).toFixed(2));
    const bonus = rate.plusDriverBonus || 0.10;
    const driverEarnings = parseFloat(((order.shippingCost || 0) + bonus).toFixed(2));

    // Execute wallet deduction and order assignment in transaction
    const updatedOrder = await prisma.$transaction(async (tx) => {
      if (!isPlusOrder) {
        // Deduct take commission from wallet
        await tx.user.update({
          where: { id: userId },
          data: {
            walletBalance: {
              decrement: rate.costPerOrder,
            },
          },
        });

        // Log transaction
        await tx.walletTransaction.create({
          data: {
            userId,
            amount: -rate.costPerOrder,
            type: "COMMISSION_DEDUCTION",
            description: `Comisión de despacho por tomar Pedido #${orderId}`,
          },
        });
      }

      // Assign driver to order and save calculated breakdown fields
      const resOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.DELIVERING,
          deliveryDriverId: userId,
          providerPayAmount: providerPay,
          driverEarnings: driverEarnings,
          appCommissionFromProvider: appCommission,
        },
      });

      return resOrder;
    });

    // Notify POS real-time clients that order has been taken
    const io = req.app.get("io");
    if (io) {
      io.to(`restaurant-${order.restaurantId}`).emit("order-status-updated", {
        orderId: order.id,
        status: OrderStatus.DELIVERING,
        driverName: driver.name,
      });
    }

    return res.status(200).json({ success: true, message: "Pedido tomado con éxito", order: updatedOrder });
  } catch (error) {
    next(error);
  }
}

// 3. Mark delivery as complete
export async function completeDelivery(req: Request, res: Response, next: NextFunction) {
  try {
    const orderId = parseInt(req.params.id, 10);
    const userId = req.user?.userId;

    if (isNaN(orderId) || !userId) {
      return res.status(400).json({ success: false, message: "Invalid parameters" });
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, deliveryDriverId: userId, status: OrderStatus.DELIVERING },
      include: {
        customer: true,
        restaurant: true,
      },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: "Pedido activo no encontrado" });
    }

    const isPlusOrder = order.customer?.isPlus === true;
    const rate = await getActiveDeliveryRate();

    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Complete order
      const resOrder = await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.DELIVERED },
      });

      // Calculate base driver earnings for this delivery
      let driverEarnings = 0;
      let plusBonus = 0;

      if (isPlusOrder) {
        // For Plus orders, the customer paid $0 shipping, so the platform subsidizes the delivery fee
        // We simulate the distance (or use standard base fee of $2.50) + plus bonus
        const simulatedFare = rate.basePrice + (rate.pricePerKm * 2.5); // Standard 2.5 km fare
        driverEarnings = simulatedFare;
        plusBonus = rate.plusDriverBonus;

        // Credit the driver's wallet with both standard fare (subsidized) and plus bonus
        await tx.user.update({
          where: { id: userId },
          data: {
            walletBalance: {
              increment: driverEarnings + plusBonus,
            },
          },
        });

        // Log transaction for the subsidized fare
        await tx.walletTransaction.create({
          data: {
            userId,
            amount: driverEarnings,
            type: "DELIVERY_EARNINGS",
            description: `Tarifa de envío subsidiada (GoEats Plus) por Pedido #${orderId}`,
          },
        });

        // Log transaction for the plus bonus
        await tx.walletTransaction.create({
          data: {
            userId,
            amount: plusBonus,
            type: "PLUS_BONUS",
            description: `Bono GoEats Plus por entregar Pedido #${orderId}`,
          },
        });

      } else {
        // Regular orders (Cash or Online)
        const paymentMethod = order.paymentMethodString || "CASH";
        const commissionPct = order.restaurant?.deliveryCommissionPercentage ?? 10.0;
        const foodSubtotal = Math.max(0, order.total - (order.shippingCost || 0));
        const appCommission = parseFloat(((foodSubtotal * commissionPct) / 100).toFixed(2));
        const providerPay = parseFloat((foodSubtotal - appCommission).toFixed(2));
        const bonus = rate.plusDriverBonus || 0.10;
        driverEarnings = parseFloat(((order.shippingCost || 0) + bonus).toFixed(2));

        if (paymentMethod === "CASH") {
          // ==========================================
          // CASO EFECTIVO (MODELO ZAYMI):
          // - Motorizado pagó en local: providerPay
          // - Motorizado cobró al cliente: order.total
          // - Efectivo restante en bolsillo: order.total - providerPay
          // - Su ganancia justa es: driverEarnings
          // - Excedente que retuvo y pertenece a GoEats: (order.total - providerPay) - driverEarnings
          // ==========================================
          const cashInHand = order.total - providerPay;
          const netDebtOwedToApp = parseFloat((cashInHand - driverEarnings).toFixed(2));

          if (netDebtOwedToApp > 0) {
            await tx.user.update({
              where: { id: userId },
              data: {
                walletBalance: {
                  decrement: netDebtOwedToApp,
                },
              },
            });

            await tx.walletTransaction.create({
              data: {
                userId,
                amount: -netDebtOwedToApp,
                type: "CASH_COLLECTED_DEDUCTION",
                description: `Comisión retenida de Pedido #${orderId} (Cobró $${order.total.toFixed(2)} efectivo, pagó $${providerPay.toFixed(2)} en local, ganancia $${driverEarnings.toFixed(2)})`,
              },
            });
          } else if (netDebtOwedToApp < 0) {
            // El bono superó la comisión, el repartidor recibe saldo a favor
            const creditToDriver = Math.abs(netDebtOwedToApp);
            await tx.user.update({
              where: { id: userId },
              data: {
                walletBalance: {
                  increment: creditToDriver,
                },
              },
            });

            await tx.walletTransaction.create({
              data: {
                userId,
                amount: creditToDriver,
                type: "DELIVERY_EARNINGS",
                description: `Bono neto a favor por Pedido #${orderId}`,
              },
            });
          }

        } else {
          // ==========================================
          // CASO EN LÍNEA (TARJETA / TRANSFERENCIA):
          // - Cliente pagó a GoEats: $0 cobrado por motorizado
          // - Motorizado pagó en el restaurante: providerPay
          // - Ganancia que le corresponde: driverEarnings
          // - Reembolso total a favor en billetera: providerPay + driverEarnings
          // ==========================================
          const totalCredit = parseFloat((providerPay + driverEarnings).toFixed(2));

          await tx.user.update({
            where: { id: userId },
            data: {
              walletBalance: {
                increment: totalCredit,
              },
            },
          });

          await tx.walletTransaction.create({
            data: {
              userId,
              amount: totalCredit,
              type: "DELIVERY_EARNINGS",
              description: `Reembolso de compra ($${providerPay.toFixed(2)}) + Ganancia flete ($${driverEarnings.toFixed(2)}) de Pedido #${orderId} (Pago en Línea)`,
            },
          });
        }
      }

      return resOrder;
    });

    // Notify POS
    const io = req.app.get("io");
    if (io) {
      io.to(`restaurant-${order.restaurantId}`).emit("order-status-updated", {
        orderId: order.id,
        status: OrderStatus.DELIVERED,
      });
    }

    return res.status(200).json({ success: true, message: "Pedido entregado correctamente", order: updatedOrder });
  } catch (error) {
    next(error);
  }
}

// 4. Add delivery observation
export async function addObservation(req: Request, res: Response, next: NextFunction) {
  try {
    const orderId = parseInt(req.params.id, 10);
    const userId = req.user?.userId;
    const { observation } = req.body;

    if (isNaN(orderId) || !userId || !observation) {
      return res.status(400).json({ success: false, message: "Observation and valid ID are required" });
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, deliveryDriverId: userId },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: "Pedido no encontrado" });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { deliveryObservation: observation },
    });

    return res.status(200).json({ success: true, message: "Observación registrada con éxito", order: updatedOrder });
  } catch (error) {
    next(error);
  }
}

// 5. Get active orders for current driver
export async function getDriverActiveOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const orders = await prisma.order.findMany({
      where: {
        deliveryDriverId: userId,
        status: OrderStatus.DELIVERING,
      },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            mapLatitude: true,
            mapLongitude: true,
            deliveryCommissionPercentage: true,
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
      },
      orderBy: { createdAt: "desc" },
    });

    const rate = await getActiveDeliveryRate();

    const enrichedOrders = orders.map((order) => {
      const commissionPct = order.restaurant?.deliveryCommissionPercentage ?? 10.0;
      const foodSubtotal = Math.max(0, order.total - (order.shippingCost || 0));
      const appCommission = order.appCommissionFromProvider ?? parseFloat(((foodSubtotal * commissionPct) / 100).toFixed(2));
      const providerPay = order.providerPayAmount ?? parseFloat((foodSubtotal - appCommission).toFixed(2));
      const bonus = rate.plusDriverBonus || 0.10;
      const driverEarnings = order.driverEarnings ?? parseFloat(((order.shippingCost || 0) + bonus).toFixed(2));

      return {
        ...order,
        financialBreakdown: {
          foodSubtotal,
          commissionPct,
          appCommissionFromProvider: appCommission,
          providerPayAmount: providerPay,
          driverBonus: bonus,
          driverEarnings,
          customerTotal: order.total,
        },
      };
    });

    return res.status(200).json({ success: true, orders: enrichedOrders });
  } catch (error) {
    next(error);
  }
}

// 6. Get driver's wallet history
export async function getDriverWalletHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const transactions = await prisma.walletTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    const driver = await prisma.user.findUnique({
      where: { id: userId },
      select: { walletBalance: true, maxDebtLimit: true },
    });

    const balance = driver?.walletBalance || 0;
    const maxDebt = driver?.maxDebtLimit ?? 50.0;
    const isDebtLocked = balance <= -maxDebt;

    return res.status(200).json({
      success: true,
      walletBalance: balance,
      maxDebtLimit: maxDebt,
      isDebtLocked,
      transactions,
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// SUPER_ADMIN WALLET & CONFIG MANAGEMENT
// ==========================================

// 7. Recharge wallet for driver (SuperAdmin only)
export async function rechargeDriverWallet(req: Request, res: Response, next: NextFunction) {
  try {
    const { driverId, amount, description } = req.body;

    if (!driverId || amount === undefined || amount <= 0) {
      return res.status(400).json({ success: false, message: "driverId and positive amount are required" });
    }

    const targetDriver = await prisma.user.findUnique({
      where: { id: parseInt(driverId, 10) },
    });

    if (!targetDriver || targetDriver.role !== Role.MOTORIZADO) {
      return res.status(404).json({ success: false, message: "Conductor no encontrado" });
    }

    const parsedAmount = parseFloat(amount);

    const result = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: targetDriver.id },
        data: {
          walletBalance: {
            increment: parsedAmount,
          },
        },
      });

      const txLog = await tx.walletTransaction.create({
        data: {
          userId: targetDriver.id,
          amount: parsedAmount,
          type: "RECHARGE",
          description: description || `Recarga de saldo por Administrador`,
        },
      });

      return { updatedUser, txLog };
    });

    return res.status(200).json({
      success: true,
      message: `Billetera recargada exitosamente con $${parsedAmount.toFixed(2)}`,
      walletBalance: result.updatedUser.walletBalance,
    });
  } catch (error) {
    next(error);
  }
}

// 8. List all drivers in the system
export async function getDriversList(req: Request, res: Response, next: NextFunction) {
  try {
    const drivers = await prisma.user.findMany({
      where: { role: Role.MOTORIZADO },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        cedula: true,
        walletBalance: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { name: "asc" },
    });

    return res.status(200).json({ success: true, drivers });
  } catch (error) {
    next(error);
  }
}

// 9. Get active delivery rate configs
export async function getDeliveryRates(req: Request, res: Response, next: NextFunction) {
  try {
    const rates = await prisma.deliveryRate.findMany({
      orderBy: { id: "asc" },
    });
    return res.status(200).json({ success: true, rates });
  } catch (error) {
    next(error);
  }
}

// 10. Update/Save delivery rates configuration
export async function saveDeliveryRate(req: Request, res: Response, next: NextFunction) {
  try {
    const { id, name, basePrice, pricePerKm, costPerOrder, plusDriverBonus, isActive } = req.body;

    if (!name || basePrice === undefined || pricePerKm === undefined || costPerOrder === undefined) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const bonusVal = plusDriverBonus !== undefined ? parseFloat(plusDriverBonus) : 0.50;

    let rate;
    if (id) {
      // Update
      rate = await prisma.deliveryRate.update({
        where: { id: parseInt(id, 10) },
        data: {
          name,
          basePrice: parseFloat(basePrice),
          pricePerKm: parseFloat(pricePerKm),
          costPerOrder: parseFloat(costPerOrder),
          plusDriverBonus: bonusVal,
          isActive: isActive !== undefined ? !!isActive : true,
        },
      });
    } else {
      // Create
      rate = await prisma.deliveryRate.create({
        data: {
          name,
          basePrice: parseFloat(basePrice),
          pricePerKm: parseFloat(pricePerKm),
          costPerOrder: parseFloat(costPerOrder),
          plusDriverBonus: bonusVal,
          isActive: isActive !== undefined ? !!isActive : true,
        },
      });
    }

    // If active, deactivate others
    if (rate.isActive) {
      await prisma.deliveryRate.updateMany({
        where: { id: { not: rate.id } },
        data: { isActive: false },
      });
    }

    return res.status(200).json({ success: true, message: "Tarifa guardada con éxito", rate });
  } catch (error) {
    next(error);
  }
}

// 11. Get currently active delivery rate
export async function getActiveRate(req: Request, res: Response, next: NextFunction) {
  try {
    const rate = await getActiveDeliveryRate();
    return res.status(200).json({ success: true, rate });
  } catch (error) {
    next(error);
  }
}

// 12. Settle driver balance (1-Click payment to driver)
export async function settleDriverBalance(req: Request, res: Response, next: NextFunction) {
  try {
    const { driverId, note } = req.body;

    if (!driverId) {
      return res.status(400).json({ success: false, message: "driverId is required" });
    }

    const targetDriver = await prisma.user.findUnique({
      where: { id: parseInt(driverId, 10) },
    });

    if (!targetDriver || targetDriver.role !== Role.MOTORIZADO) {
      return res.status(404).json({ success: false, message: "Conductor no encontrado" });
    }

    if (targetDriver.walletBalance <= 0) {
      return res.status(400).json({
        success: false,
        message: "El conductor no tiene saldo a favor pendiente de liquidar.",
      });
    }

    const amountToSettle = targetDriver.walletBalance;

    const result = await prisma.$transaction(async (tx) => {
      // Reset positive balance to 0
      const updatedUser = await tx.user.update({
        where: { id: targetDriver.id },
        data: {
          walletBalance: 0.0,
        },
      });

      const txLog = await tx.walletTransaction.create({
        data: {
          userId: targetDriver.id,
          amount: -amountToSettle,
          type: "SETTLEMENT_PAYMENT",
          description: note || `Liquidación de corte (Transferencia bancaria al repartidor: $${amountToSettle.toFixed(2)})`,
        },
      });

      return { updatedUser, txLog };
    });

    return res.status(200).json({
      success: true,
      message: `Liquidación completada. Se pagaron $${amountToSettle.toFixed(2)} al conductor.`,
      settledAmount: amountToSettle,
      walletBalance: result.updatedUser.walletBalance,
    });
  } catch (error) {
    next(error);
  }
}

// 12. Update live GPS coordinates of the delivery driver
export async function updateDriverLocation(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const { orderId, latitude, longitude } = req.body;

    if (!userId || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, message: "Driver ID and coordinates are required" });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    let updatedOrder = null;
    if (orderId) {
      const parsedId = parseInt(orderId, 10);
      updatedOrder = await prisma.order.update({
        where: { id: parsedId },
        data: {
          driverLat: lat,
          driverLng: lng,
        },
      });

      const io = req.app.get("io");
      if (io) {
        io.emit(`order-${parsedId}-location`, {
          orderId: parsedId,
          driverLat: lat,
          driverLng: lng,
        });
      }
    }

    return res.status(200).json({ success: true, driverLat: lat, driverLng: lng, order: updatedOrder });
  } catch (error) {
    next(error);
  }
}
