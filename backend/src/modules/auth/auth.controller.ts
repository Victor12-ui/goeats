import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../../config/database";
import { env } from "../../config/env";
import { Role } from "@prisma/client";

const SALT_ROUNDS = 10;

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: "Username and password are required" });
    }

    const user = await prisma.user.findUnique({
      where: { username },
      include: { restaurant: true },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: "Invalid credentials or account is suspended" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
        restaurantId: user.restaurantId,
      },
      env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        cedula: user.cedula || null,
        walletBalance: user.walletBalance,
        restaurantId: user.restaurantId,
        restaurantName: user.restaurant?.name || null,
        restaurantSlug: user.restaurant?.slug || null,
        isPlus: user.isPlus,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function registerOwner(req: Request, res: Response, next: NextFunction) {
  try {
    const { username, password, name, email, restaurantName, slug } = req.body;

    if (!username || !password || !name || !restaurantName || !slug) {
      return res.status(400).json({
        success: false,
        message: "Username, password, name, restaurantName, and slug are required",
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Username is already taken" });
    }

    // Check if restaurant slug already exists
    const existingRestaurant = await prisma.restaurant.findUnique({ where: { slug } });
    if (existingRestaurant) {
      return res.status(400).json({ success: false, message: "Restaurant slug is already taken" });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Run in a transaction to create both the restaurant and the owner user
    const result = await prisma.$transaction(async (tx) => {
      const restaurant = await tx.restaurant.create({
        data: {
          name: restaurantName,
          slug: slug.toLowerCase().trim(),
        },
      });

      const user = await tx.user.create({
        data: {
          username,
          password: hashedPassword,
          name,
          email,
          role: Role.RESTAURANT_OWNER,
          restaurantId: restaurant.id,
        },
      });

      // 1. Create Default Dining Area & Tables
      const diningArea = await tx.diningArea.create({
        data: {
          name: "Salón Principal",
          restaurantId: restaurant.id,
        },
      });

      await tx.table.createMany({
        data: [
          { number: "1", capacity: 4, diningAreaId: diningArea.id },
          { number: "2", capacity: 4, diningAreaId: diningArea.id },
          { number: "3", capacity: 4, diningAreaId: diningArea.id },
        ],
      });

      // 2. Create Default Cash Register
      await tx.cashRegister.create({
        data: {
          name: "Caja Principal POS",
          restaurantId: restaurant.id,
          isActive: true,
        },
      });

      // 3. Create Default Client (Consumidor Final)
      await tx.client.create({
        data: {
          name: "CONSUMIDOR FINAL",
          typeId: "07",
          identification: "9999999999999",
          address: "S/N",
          email: "cf@gmail.com",
          phone: "0999999999",
          restaurantId: restaurant.id,
        },
      });

      // 4. Create Production Areas (Cocina, Bar)
      await tx.productionArea.createMany({
        data: [
          { name: "Cocina", restaurantId: restaurant.id },
          { name: "Bar", restaurantId: restaurant.id },
        ],
      });

      // 5. Create default menu categories
      await tx.menuCategory.create({
        data: {
          name: "General",
          description: "Categoría inicial de platos",
          restaurantId: restaurant.id,
        },
      });

      return { user, restaurant };
    });

    return res.status(201).json({
      success: true,
      message: "Restaurant and owner registered successfully",
      restaurant: result.restaurant,
      user: {
        id: result.user.id,
        username: result.user.username,
        name: result.user.name,
        role: result.user.role,
        restaurantId: result.user.restaurantId,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function registerStaff(req: Request, res: Response, next: NextFunction) {
  try {
    const { username, password, name, email, role } = req.body;
    const currentRestaurantId = req.restaurantId;

    if (!username || !password || !name || !role) {
      return res.status(400).json({ success: false, message: "Username, password, name, and role are required" });
    }

    if (!Object.values(Role).includes(role) || role === Role.SUPER_ADMIN || role === Role.RESTAURANT_OWNER) {
      return res.status(400).json({ success: false, message: "Invalid staff role specified" });
    }

    if (!currentRestaurantId) {
      return res.status(400).json({ success: false, message: "Restaurant context is missing" });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Username is already taken" });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        name,
        email,
        role,
        restaurantId: currentRestaurantId,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Staff member registered successfully",
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        restaurantId: user.restaurantId,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getProfile(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { restaurant: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        cedula: user.cedula || null,
        walletBalance: user.walletBalance,
        restaurantId: user.restaurantId,
        restaurant: user.restaurant,
        isPlus: user.isPlus,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function registerCustomer(req: Request, res: Response, next: NextFunction) {
  try {
    const { username, password, name, email, cedula } = req.body;

    if (!username || !password || !name || !cedula) {
      return res.status(400).json({
        success: false,
        message: "El nombre de usuario, contraseña, nombre y cédula son requeridos.",
      });
    }

    const cleanCedula = cedula.replace(/\D/g, "");
    if (cleanCedula.length !== 10) {
      return res.status(400).json({
        success: false,
        message: "La cédula ecuatoriana debe tener exactamente 10 dígitos numéricos.",
      });
    }

    const existingCedula = await prisma.user.findFirst({
      where: { cedula: cleanCedula }
    });
    if (existingCedula) {
      return res.status(400).json({
        success: false,
        message: "Ya existe una cuenta registrada con esta cédula.",
      });
    }

    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "El nombre de usuario ya está en uso." });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        name,
        email,
        cedula: cleanCedula,
        role: Role.CUSTOMER,
        walletBalance: 0.0,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Cliente registrado exitosamente",
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        cedula: user.cedula,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function registerDriver(req: Request, res: Response, next: NextFunction) {
  try {
    const { username, password, name, email, cedula } = req.body;

    if (!username || !password || !name || !cedula) {
      return res.status(400).json({
        success: false,
        message: "El nombre de usuario, contraseña, nombre y cédula son requeridos.",
      });
    }

    const cleanCedula = cedula.replace(/\D/g, "");
    if (cleanCedula.length !== 10) {
      return res.status(400).json({
        success: false,
        message: "La cédula debe tener exactamente 10 dígitos numéricos.",
      });
    }

    const existingCedula = await prisma.user.findFirst({
      where: { cedula: cleanCedula }
    });
    if (existingCedula) {
      return res.status(400).json({
        success: false,
        message: "Ya existe un usuario registrado con esta cédula.",
      });
    }

    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "El nombre de usuario ya está en uso." });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        name,
        email,
        cedula: cleanCedula,
        role: Role.MOTORIZADO,
        walletBalance: 0.0,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Motorizado registrado exitosamente",
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        cedula: user.cedula,
        walletBalance: user.walletBalance,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function resetDatabase(req: any, res: any, next: any) {
  try {
    // Delete transactions in dependency order
    await prisma.$transaction([
      prisma.walletTransaction.deleteMany(),
      prisma.orderItem.deleteMany(),
      prisma.invoiceItem.deleteMany(),
      prisma.invoice.deleteMany(),
      prisma.sale.deleteMany(),
      prisma.expense.deleteMany(),
      prisma.income.deleteMany(),
      prisma.cashSession.deleteMany(),
      prisma.inventoryMovement.deleteMany(),
      prisma.purchaseCredit.deleteMany(),
      prisma.purchaseItem.deleteMany(),
      prisma.purchase.deleteMany(),
      
      // Reset statuses
      prisma.table.updateMany({
        data: { status: "FREE" }
      }),
      prisma.user.updateMany({
        data: { walletBalance: 0.0 }
      })
    ]);

    return res.status(200).json({
      success: true,
      message: "El sistema ha sido vaciado por completo de transacciones y estados."
    });
  } catch (error: any) {
    next(error);
  }
}

export async function getStaff(req: Request, res: Response, next: NextFunction) {
  try {
    const restaurantId = req.restaurantId;
    if (!restaurantId) {
      return res.status(400).json({ success: false, message: "Restaurant context is missing" });
    }
    const staff = await prisma.user.findMany({
      where: {
        restaurantId,
        role: {
          in: [Role.CAJERO, Role.PRODUCCION, Role.MOZO]
        }
      },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true
      },
      orderBy: { name: "asc" }
    });
    return res.status(200).json({ success: true, staff });
  } catch (error) {
    next(error);
  }
}

export async function updateStaff(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    const restaurantId = req.restaurantId;
    const { name, email, role, password, isActive } = req.body;

    if (isNaN(id) || !restaurantId) {
      return res.status(400).json({ success: false, message: "Invalid ID or restaurant context missing" });
    }

    const staff = await prisma.user.findFirst({
      where: {
        id,
        restaurantId,
        role: { in: [Role.CAJERO, Role.PRODUCCION, Role.MOZO] }
      }
    });

    if (!staff) {
      return res.status(404).json({ success: false, message: "Staff member not found" });
    }

    const dataToUpdate: any = {
      name,
      email,
      isActive: isActive !== undefined ? isActive : undefined
    };

    if (role) {
      if (![Role.CAJERO, Role.PRODUCCION, Role.MOZO].includes(role)) {
        return res.status(400).json({ success: false, message: "Invalid role for staff member" });
      }
      dataToUpdate.role = role;
    }

    if (password && password.trim() !== "") {
      dataToUpdate.password = await bcrypt.hash(password, SALT_ROUNDS);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        isActive: true
      }
    });

    return res.status(200).json({ success: true, message: "Staff member updated successfully", user: updated });
  } catch (error) {
    next(error);
  }
}

export async function deleteStaff(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    const restaurantId = req.restaurantId;

    if (isNaN(id) || !restaurantId) {
      return res.status(400).json({ success: false, message: "Invalid ID or restaurant context missing" });
    }

    const staff = await prisma.user.findFirst({
      where: {
        id,
        restaurantId,
        role: { in: [Role.CAJERO, Role.PRODUCCION, Role.MOZO] }
      }
    });

    if (!staff) {
      return res.status(404).json({ success: false, message: "Staff member not found" });
    }

    await prisma.user.delete({ where: { id } });

    return res.status(200).json({ success: true, message: "Staff member deleted successfully" });
  } catch (error) {
    next(error);
  }
}
