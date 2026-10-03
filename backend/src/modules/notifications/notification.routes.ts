import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth";
import { authorize } from "../../middlewares/rbac";
import { Role } from "@prisma/client";

import {
  getEmailLogs,
  getEmailStats,
  sendTestEmail,
  retryEmail,
} from "./notification.controller";

const router = Router();

// Todas las rutas de administración de correos requieren SUPER_ADMIN
router.use(authMiddleware, authorize([Role.SUPER_ADMIN]));


router.get("/logs", getEmailLogs);
router.get("/stats", getEmailStats);
router.post("/test-email", sendTestEmail);
router.post("/retry/:id", retryEmail);

export default router;
