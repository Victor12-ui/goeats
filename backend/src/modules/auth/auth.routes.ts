import { Router } from "express";
import {
  login,
  registerOwner,
  registerStaff,
  getProfile,
  registerCustomer,
  registerDriver,
  resetDatabase,
  getStaff,
  updateStaff,
  deleteStaff
} from "./auth.controller";
import { authMiddleware } from "../../middlewares/auth";
import { tenantMiddleware } from "../../middlewares/tenant";
import { authorize } from "../../middlewares/rbac";
import { Role } from "@prisma/client";

const router = Router();

router.post("/login", login);
router.post("/register-owner", registerOwner);
router.post("/register-customer", registerCustomer);
router.post("/register-driver", registerDriver);

// Protected staff routes
router.post(
  "/register-staff",
  authMiddleware,
  tenantMiddleware,
  authorize([Role.RESTAURANT_OWNER]),
  registerStaff
);
router.get(
  "/staff",
  authMiddleware,
  tenantMiddleware,
  authorize([Role.RESTAURANT_OWNER]),
  getStaff
);
router.put(
  "/staff/:id",
  authMiddleware,
  tenantMiddleware,
  authorize([Role.RESTAURANT_OWNER]),
  updateStaff
);
router.delete(
  "/staff/:id",
  authMiddleware,
  tenantMiddleware,
  authorize([Role.RESTAURANT_OWNER]),
  deleteStaff
);

// Get logged-in user profile
router.get("/profile", authMiddleware, getProfile);

// Reset database transactions (superadmin and owner only)
router.post("/reset-database", authMiddleware, authorize([Role.SUPER_ADMIN, Role.RESTAURANT_OWNER]), resetDatabase);

export default router;
