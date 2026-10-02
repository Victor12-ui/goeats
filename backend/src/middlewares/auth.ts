import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { Role } from "@prisma/client";

export interface TokenPayload {
  userId: number;
  username: string;
  role: Role;
  restaurantId: number | null;
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
      restaurantId?: number; // Injected for multi-tenant
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "No token provided, authorization denied" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Token is invalid or expired" });
  }
}
