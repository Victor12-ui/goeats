import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth";
import { authorize } from "../../middlewares/rbac";
import { Role } from "@prisma/client";
import {
  getAvailableOrders,
  takeOrder,
  completeDelivery,
  addObservation,
  getDriverActiveOrders,
  getDriverWalletHistory,
  rechargeDriverWallet,
  getDriversList,
  toggleDriverActive,
  getDeliveryRates,
  saveDeliveryRate,
  getActiveRate,
  settleDriverBalance,
  updateDriverLocation,
} from "./delivery.controller";

const router = Router();

// Apply auth middleware to all delivery routes
router.use(authMiddleware);

// Driver endpoints (Role: MOTORIZADO)
router.get("/available", authorize([Role.MOTORIZADO]), getAvailableOrders);
router.post("/take/:id", authorize([Role.MOTORIZADO]), takeOrder);
router.post("/complete/:id", authorize([Role.MOTORIZADO]), completeDelivery);
router.post("/observation/:id", authorize([Role.MOTORIZADO]), addObservation);
router.post("/location", authorize([Role.MOTORIZADO]), updateDriverLocation);
router.get("/active", authorize([Role.MOTORIZADO]), getDriverActiveOrders);
router.get("/wallet", authorize([Role.MOTORIZADO]), getDriverWalletHistory);

// Super Admin endpoints (Role: SUPER_ADMIN)
router.get("/drivers", authorize([Role.SUPER_ADMIN]), getDriversList);
router.post("/drivers/:id/toggle-active", authorize([Role.SUPER_ADMIN]), toggleDriverActive);
router.post("/recharge", authorize([Role.SUPER_ADMIN]), rechargeDriverWallet);
router.post("/settle", authorize([Role.SUPER_ADMIN]), settleDriverBalance);
router.get("/rates", authorize([Role.SUPER_ADMIN]), getDeliveryRates);
router.post("/rates", authorize([Role.SUPER_ADMIN]), saveDeliveryRate);

// General auth endpoint (e.g. CUSTOMER needs to calculate shipping cost)
router.get("/active-rate", getActiveRate);

export default router;
