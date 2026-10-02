import { Router } from "express";
import {
  getPurchases,
  getPurchaseById,
  createPurchase,
  getPurchaseCredits,
  payCreditInstallment,
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from "./purchases.controller";
import { authMiddleware } from "../../middlewares/auth";
import { tenantMiddleware } from "../../middlewares/tenant";
import { authorize } from "../../middlewares/rbac";
import { Role } from "@prisma/client";

const router = Router();

// Apply auth and tenant middlewares to all routes
router.use(authMiddleware);
router.use(tenantMiddleware);

// Suppliers CRUD
router.get("/suppliers", getSuppliers);
router.post("/suppliers", authorize([Role.RESTAURANT_OWNER]), createSupplier);
router.put("/suppliers/:id", authorize([Role.RESTAURANT_OWNER]), updateSupplier);
router.delete("/suppliers/:id", authorize([Role.RESTAURANT_OWNER]), deleteSupplier);

// Credits
router.get("/credits", getPurchaseCredits);
router.post("/credits/:id/pay", authorize([Role.RESTAURANT_OWNER, Role.CAJERO]), payCreditInstallment);

// Purchases
router.get("/", getPurchases);
router.post("/", authorize([Role.RESTAURANT_OWNER, Role.CAJERO]), createPurchase);
router.get("/:id", getPurchaseById);

export default router;
