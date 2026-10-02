import { Router } from "express";
import {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  changeTable,
  cancelOrder,
  updateOrder,
} from "./orders.controller";
import { authMiddleware } from "../../middlewares/auth";
import { tenantMiddleware } from "../../middlewares/tenant";
import { authorize } from "../../middlewares/rbac";
import { Role } from "@prisma/client";

const router = Router();

// Apply auth and tenant middlewares to all routes
router.use(authMiddleware);
router.use(tenantMiddleware);

router.get("/", getOrders);
router.post("/", authorize([Role.RESTAURANT_OWNER, Role.CAJERO, Role.MOZO]), createOrder);
router.get("/:id", getOrderById);
router.put("/:id", authorize([Role.RESTAURANT_OWNER, Role.CAJERO, Role.MOZO]), updateOrder);
router.put("/:id/status", authorize([Role.RESTAURANT_OWNER, Role.CAJERO, Role.PRODUCCION, Role.MOZO]), updateOrderStatus);
router.post("/:id/change-table", authorize([Role.RESTAURANT_OWNER, Role.CAJERO, Role.MOZO]), changeTable);
router.post("/:id/cancel", authorize([Role.RESTAURANT_OWNER, Role.CAJERO, Role.MOZO]), cancelOrder);

export default router;
