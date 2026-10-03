import { Request, Response, NextFunction } from "express";
import { prisma } from "../../config/database";
import { env } from "../../config/env";
import { NotificationService } from "./notification.service";
import { NotificationEvent } from "./notification.types";

/**
 * Obtener historial de correos enviados / fallidos (Sección 10 y 12 del Plan)
 */
export async function getEmailLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const skip = (page - 1) * limit;

    const { status, type, search } = req.query;

    const where: any = {};
    if (status && status !== "ALL") {
      where.status = status;
    }
    if (type && type !== "ALL") {
      where.type = type;
    }
    if (search) {
      where.OR = [
        { recipientEmail: { contains: String(search) } },
        { subject: { contains: String(search) } },
        { eventId: { contains: String(search) } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.emailNotification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.emailNotification.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Métricas generales y estado de configuración de Gmail OAuth2
 */
export async function getEmailStats(req: Request, res: Response, next: NextFunction) {
  try {
    const [total, sent, failed, pending] = await Promise.all([
      prisma.emailNotification.count(),
      prisma.emailNotification.count({ where: { status: "SENT" } }),
      prisma.emailNotification.count({ where: { status: "FAILED" } }),
      prisma.emailNotification.count({ where: { status: { in: ["PENDING", "SENDING"] } } }),
    ]);

    const isGmailOAuthReady = Boolean(
      env.GMAIL_USER &&
      env.GMAIL_CLIENT_ID &&
      env.GMAIL_CLIENT_SECRET &&
      env.GMAIL_REFRESH_TOKEN
    );

    return res.status(200).json({
      success: true,
      stats: {
        total,
        sent,
        failed,
        pending,
        gmailConfig: {
          isReady: isGmailOAuthReady,
          user: env.GMAIL_USER || null,
          hasClientId: Boolean(env.GMAIL_CLIENT_ID),
          hasClientSecret: Boolean(env.GMAIL_CLIENT_SECRET),
          hasRefreshToken: Boolean(env.GMAIL_REFRESH_TOKEN),
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Enviar un correo de prueba para verificar credenciales de Gmail OAuth2 en vivo
 */
export async function sendTestEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const { to, role } = req.body;
    const recipientEmail = to || req.user?.username || env.GMAIL_USER;

    if (!recipientEmail || !recipientEmail.includes("@")) {
      return res.status(400).json({
        success: false,
        message: "Proporciona un correo electrónico válido de destino para la prueba.",
      });
    }

    let event = NotificationEvent.CUSTOMER_WELCOME;
    let data: any = { name: "Usuario de Prueba Go Eats" };

    if (role === "DRIVER") {
      event = NotificationEvent.DRIVER_WELCOME;
    } else if (role === "RESTAURANT") {
      event = NotificationEvent.RESTAURANT_APPLICATION_RECEIVED;
      data = { restaurantName: "Parrillada Gourmet GoEats" };
    }

    const result = await NotificationService.dispatch({
      recipient: {
        email: recipientEmail,
        name: "Administrador Go Eats",
        userId: req.user?.userId,
      },
      event,
      eventId: `test_${Date.now()}`,
      data,
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: `Fallo al enviar correo de prueba: ${result.error}`,
      });
    }

    return res.status(200).json({
      success: true,
      message: `¡Correo de prueba enviado con éxito a ${recipientEmail}!`,
      notification: result.notification,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Reintentar envío de un correo fallido
 */
export async function retryEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: "ID inválido" });
    }

    const log = await prisma.emailNotification.findUnique({ where: { id } });
    if (!log) {
      return res.status(404).json({ success: false, message: "Notificación no encontrada" });
    }

    let parsedData: any = {};
    try {
      if (log.metadataJson) {
        parsedData = JSON.parse(log.metadataJson);
      }
    } catch (_) {}

    const result = await NotificationService.dispatch({
      recipient: {
        email: log.recipientEmail,
        name: parsedData.name || "Usuario",
        userId: log.userId || undefined,
      },
      event: log.type as NotificationEvent,
      eventId: `retry_${log.id}_${Date.now()}`,
      data: parsedData,
    });

    return res.status(200).json({
      success: result.success,
      message: result.success ? "Correo reintentado exitosamente" : `Error al reintentar: ${result.error}`,
    });
  } catch (error) {
    next(error);
  }
}
