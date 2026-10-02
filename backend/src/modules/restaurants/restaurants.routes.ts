import { Router } from "express";
import {
  getAllRestaurants,
  getRestaurantById,
  updateRestaurant,
  getPublicRestaurantCatalog,
  getPublicRestaurantList,
  createPublicOrder,
} from "./restaurants.controller";
import { authMiddleware } from "../../middlewares/auth";
import { authorize } from "../../middlewares/rbac";
import { Role } from "@prisma/client";

const router = Router();

// Public routes for aggregator and client ordering
router.get("/public/list", getPublicRestaurantList);
router.get("/public/catalog/:slug", getPublicRestaurantCatalog);
router.post("/public/catalog/:slug/order", createPublicOrder);

// Private routes
router.get("/", authMiddleware, authorize([Role.SUPER_ADMIN]), getAllRestaurants);
router.get("/:id", authMiddleware, getRestaurantById);
router.put("/:id", authMiddleware, authorize([Role.SUPER_ADMIN, Role.RESTAURANT_OWNER]), updateRestaurant);

export default router;
