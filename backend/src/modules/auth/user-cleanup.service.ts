import { prisma } from "../../config/database";

/**
 * Elimina de manera segura un usuario limpiando y desvinculando todas las relaciones
 * para no violar restricciones de clave foránea ni corromper auditorías ni ventas históricas.
 */
export async function safeDeleteUser(userId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, role: true },
    });

    if (!user) {
      return { success: false, error: "Usuario no encontrado" };
    }

    await prisma.$transaction(async (tx) => {
      // 1. Desvincular de pedidos como cliente manteniendo el histórico de ventas
      await tx.order.updateMany({
        where: { customerId: userId },
        data: { customerId: null },
      });

      // 2. Desvincular de pedidos como repartidor
      await tx.order.updateMany({
        where: { deliveryDriverId: userId },
        data: { deliveryDriverId: null },
      });

      // 3. Desvincular de pedidos como mozo
      await tx.order.updateMany({
        where: { mozoId: userId },
        data: { mozoId: null },
      });

      // 4. Desvincular cajas asignadas
      await tx.cashRegister.updateMany({
        where: { assignedUserId: userId },
        data: { assignedUserId: null },
      });

      // 5. Eliminar órdenes SaaS y transacciones de billetera del usuario
      await tx.saaSOrder.deleteMany({ where: { userId } });
      await tx.walletTransaction.deleteMany({ where: { userId } });

      // 6. Desvincular historial de notificaciones por correo
      await tx.emailNotification.updateMany({
        where: { userId },
        data: { userId: null },
      });

      // 7. Eliminar el registro del usuario
      await tx.user.delete({
        where: { id: userId },
      });
    });

    return { success: true };
  } catch (error: any) {
    console.error(`[safeDeleteUser] Error al eliminar usuario ID ${userId}:`, error);
    return { success: false, error: error.message || String(error) };
  }
}
