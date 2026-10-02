import { Router } from "express";
import { emitSale, getSales, getSaleById, getInvoicePdf, retryBilling } from "./sales.controller";
import { authMiddleware } from "../../middlewares/auth";
import { tenantMiddleware } from "../../middlewares/tenant";
import { authorize } from "../../middlewares/rbac";
import { Role } from "@prisma/client";

const router = Router();

// Apply auth and tenant middlewares to all routes
router.use(authMiddleware);
router.use(tenantMiddleware);

router.get("/", getSales);
router.post("/", authorize([Role.RESTAURANT_OWNER, Role.CAJERO]), emitSale);
router.get("/:id", getSaleById);
router.get("/invoices/:id/pdf", getInvoicePdf);
router.post("/:id/retry-billing", authorize([Role.RESTAURANT_OWNER, Role.CAJERO]), retryBilling);

export default router;
