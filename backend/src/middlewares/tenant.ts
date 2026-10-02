import { Request, Response, NextFunction } from "express";

export function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  let restaurantIdStr: string | undefined;

  // 1. Check x-restaurant-id header
  if (req.headers["x-restaurant-id"]) {
    restaurantIdStr = req.headers["x-restaurant-id"] as string;
  }
  // 2. Check token payload if authenticated
  else if (req.user && req.user.restaurantId) {
    restaurantIdStr = req.user.restaurantId.toString();
  }

  if (!restaurantIdStr) {
    // If it's a SuperAdmin, they are allowed to operate without a specific tenant context on some endpoints,
    // but on tenant-specific routes they must specify it.
    if (req.user && req.user.role === "SUPER_ADMIN") {
      return next();
    }
    return res.status(400).json({
      success: false,
      message: "x-restaurant-id header or user tenant context is required",
    });
  }

  const restaurantId = parseInt(restaurantIdStr, 10);
  if (isNaN(restaurantId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid x-restaurant-id header value",
    });
  }

  // Set the tenant ID on request
  req.restaurantId = restaurantId;
  next();
}
