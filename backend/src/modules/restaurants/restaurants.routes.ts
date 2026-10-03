import { Router } from "express";
import {
  getAllRestaurants,
  getRestaurantById,
  updateRestaurant,
  getPublicRestaurantCatalog,
  getPublicRestaurantList,
  createPublicOrder,
  callWaiterFromTable,
  resolveMapsUrl,
  approveRestaurant,
  rejectRestaurant,
  reviewRestaurant,
} from "./restaurants.controller";
import { authMiddleware } from "../../middlewares/auth";
import { authorize } from "../../middlewares/rbac";
import { Role } from "@prisma/client";

const router = Router();

// Public routes for aggregator and client ordering
router.get("/public/list", getPublicRestaurantList);
router.get("/public/catalog/:slug", getPublicRestaurantCatalog);
router.post("/public/catalog/:slug/order", createPublicOrder);
router.post("/public/catalog/:slug/call-waiter", callWaiterFromTable);
router.post("/resolve-maps-url", resolveMapsUrl);

// Private routes
router.get("/", authMiddleware, authorize([Role.SUPER_ADMIN]), getAllRestaurants);
router.get("/:id", authMiddleware, getRestaurantById);
router.put("/:id", authMiddleware, authorize([Role.SUPER_ADMIN, Role.RESTAURANT_OWNER]), updateRestaurant);

// Restaurant approval management (Super Admin only)
router.post("/:id/approve", authMiddleware, authorize([Role.SUPER_ADMIN]), approveRestaurant);
router.post("/:id/reject", authMiddleware, authorize([Role.SUPER_ADMIN]), rejectRestaurant);
router.post("/:id/review", authMiddleware, authorize([Role.SUPER_ADMIN]), reviewRestaurant);

export default router;
