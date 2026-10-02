import { Router } from "express";
import {
  getSupplies,
  createSupply,
  updateSupply,
  deleteSupply,
  getInventoryMovements,
  logManualMovement,
  getSupplyCategories,
  getUnitsOfMeasure,
} from "./inventory.controller";
import { authMiddleware } from "../../middlewares/auth";
import { tenantMiddleware } from "../../middlewares/tenant";
import { authorize } from "../../middlewares/rbac";
import { Role } from "@prisma/client";

const router = Router();

// Apply auth and tenant middlewares to all routes
router.use(authMiddleware);

// Metadata routes (don't strictly need tenant context as they are global in the seed)
router.get("/categories", getSupplyCategories);
router.get("/units", getUnitsOfMeasure);

// Supplies routes
router.get("/supplies", tenantMiddleware, getSupplies);
router.post("/supplies", tenantMiddleware, authorize([Role.RESTAURANT_OWNER]), createSupply);
router.put("/supplies/:id", tenantMiddleware, authorize([Role.RESTAURANT_OWNER]), updateSupply);
router.delete("/supplies/:id", tenantMiddleware, authorize([Role.RESTAURANT_OWNER]), deleteSupply);

// Kardex routes
router.get("/movements", tenantMiddleware, getInventoryMovements);
router.post("/movements", tenantMiddleware, authorize([Role.RESTAURANT_OWNER, Role.CAJERO]), logManualMovement);

export default router;
