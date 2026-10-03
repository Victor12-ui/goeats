import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { prisma } from "../../config/database";
import { env } from "../../config/env";
import { Role } from "@prisma/client";
import { sendWelcomeEmail } from "../../services/email";
import { NotificationService } from "../notifications/notification.service";
import { verifyGoogleToken, verifyFacebookToken } from "../../services/oauth";


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

    if (!user) {
      return res.status(401).json({ success: false, message: "Usuario o contraseña incorrectos" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Usuario o contraseña incorrectos" });
    }

    // Verificación de aprobación según el rol
    if (!user.isActive) {
      if (user.role === Role.MOTORIZADO) {
        return res.status(403).json({
          success: false,
          pendingApproval: true,
          message: "Tu cuenta de repartidor está en proceso de revisión por el equipo administrativo. Te notificaremos por correo electrónico una vez aprobada.",
        });
      }
      if (user.role === Role.RESTAURANT_OWNER) {
        return res.status(403).json({
          success: false,
          pendingApproval: true,
          message: "La solicitud de tu restaurante está en proceso de revisión por el equipo administrativo. Te notificaremos por correo electrónico una vez aprobada.",
        });
      }
      return res.status(403).json({
        success: false,
        message: "Tu cuenta se encuentra inactiva o suspendida. Por favor, comunícate con el administrador.",
      });
    }

    if (user.role === Role.RESTAURANT_OWNER && user.restaurant) {
      if (user.restaurant.status === "PENDING" || user.restaurant.status === "UNDER_REVIEW") {
        return res.status(403).json({
          success: false,
          pendingApproval: true,
          message: "La solicitud de tu restaurante está en proceso de revisión por el equipo administrativo. Te notificaremos por correo electrónico una vez aprobada.",
        });
      }
      if (user.restaurant.status === "REJECTED") {
        return res.status(403).json({
          success: false,
          message: "La solicitud de tu restaurante fue rechazada por el equipo administrativo.",
        });
      }
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

    const rawPreferences = (user as any).preferencesJson;
    let preferences: string[] = [];
    if (rawPreferences) {
      try {
        preferences = JSON.parse(rawPreferences);
      } catch (e) {
        preferences = [];
      }
    }

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
        preferences,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function registerOwner(req: Request, res: Response, next: NextFunction) {
  try {
    const { username, password, name, email, phone, restaurantName, slug, address } = req.body;

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
          address: address || null,
          phone: phone || null,
          status: "PENDING", // Queda pendiente de aprobación por el SuperAdmin
        },
      });

      const user = await tx.user.create({
        data: {
          username,
          password: hashedPassword,
          name,
          email,
          phone: phone || null,
          role: Role.RESTAURANT_OWNER,
          restaurantId: restaurant.id,
          isActive: false, // RESTAURANTE: Requiere aprobación previa del SuperAdmin
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

    if (result.user.email) {
      NotificationService.notifyRestaurantApplicationReceived(
        { id: result.restaurant.id, name: result.restaurant.name },
        { id: result.user.id, name: result.user.name, email: result.user.email }
      ).catch((err) => console.warn("[Notification] Error restaurante recibido:", err));
    }

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

    const rawPreferences = (user as any).preferencesJson;
    let preferences: string[] = [];
    if (rawPreferences) {
      try {
        preferences = JSON.parse(rawPreferences);
      } catch (e) {
        preferences = [];
      }
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
        preferences,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function registerCustomer(req: Request, res: Response, next: NextFunction) {
  try {
    const { username, password, name, email, cedula, phone } = req.body;

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
        phone: phone || null,
        cedula: cleanCedula,
        role: Role.CUSTOMER,
        walletBalance: 0.0,
        isActive: true, // CLIENTE: Activo inmediatamente sin requerir aprobación
      },
    });

    if (user.email) {
      NotificationService.notifyCustomerWelcome({ id: user.id, name: user.name, email: user.email })
        .catch((err) => console.warn("[Notification] Error bienvenida cliente:", err));
    }

    return res.status(201).json({
      success: true,
      message: "Cliente registrado exitosamente",
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        cedula: user.cedula,
        phone: user.phone,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function registerDriver(req: Request, res: Response, next: NextFunction) {
  try {
    const { username, password, name, email, cedula, phone, vehicleType, vehiclePlate } = req.body;

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
        phone: phone || null,
        vehicleType: vehicleType || "MOTO",
        vehiclePlate: vehiclePlate ? vehiclePlate.toUpperCase().trim() : null,
        cedula: cleanCedula,
        role: Role.MOTORIZADO,
        walletBalance: 0.0,
        isActive: false, // REPARTIDOR: Requiere aprobación previa del SuperAdmin
      },
    });

    if (user.email) {
      NotificationService.notifyDriverWelcome({ id: user.id, name: user.name, email: user.email })
        .catch((err) => console.warn("[Notification] Error bienvenida repartidor:", err));
    }

    return res.status(201).json({
      success: true,
      message: "Motorizado registrado exitosamente",
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        cedula: user.cedula,
        phone: user.phone,
        vehicleType: user.vehicleType,
        vehiclePlate: user.vehiclePlate,
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

export async function socialLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const { provider, idToken, credential, accessToken, token: socialToken } = req.body;
    const finalProvider = (provider || "").toLowerCase();

    // 1. Principio de seguridad estricta: Requerir OBLIGATORIAMENTE token criptográfico del proveedor
    let profile: { email: string; name: string; avatar?: string; provider: "google" | "facebook" };

    if (finalProvider === "google") {
      const token = idToken || credential || socialToken;
      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Acceso no autorizado: Se requiere un Google ID Token válido y firmado para verificar tu identidad.",
        });
      }
      profile = await verifyGoogleToken(token);
    } else if (finalProvider === "facebook") {
      const token = accessToken || socialToken;
      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Acceso no autorizado: Se requiere un User Access Token de Facebook emitido por Meta para verificar tu identidad.",
        });
      }
      profile = await verifyFacebookToken(token);
    } else {
      return res.status(400).json({
        success: false,
        message: "Proveedor no soportado. Debe ser 'google' o 'facebook'.",
      });
    }

    // 2. Extraer datos exclusivamente del perfil certificado por el proveedor oficial (evita spoofing)
    const { email, name, avatar } = profile;

    // 3. Protección contra secuestro de cuentas privilegiadas (Account Takeover Prevention)
    // Si ya existe una cuenta con este correo pero con rol administrativo o empleado,
    // bloquear el acceso social y exigir credenciales directas.
    let user = await prisma.user.findFirst({
      where: { email },
      include: { restaurant: true },
    });

    if (user && user.role !== Role.CUSTOMER) {
      return res.status(403).json({
        success: false,
        message: `Esta cuenta pertenece a un perfil con rol ${user.role}. Por principios de seguridad de la plataforma, el personal administrativo y empleados deben ingresar con su usuario y contraseña.`,
      });
    }

    let isNewUser = false;
    if (!user) {
      isNewUser = true;

      // Generar nombre de usuario seguro y no predecible
      let baseUsername = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "") || `comensal_${Date.now()}`;
      let username = baseUsername;

      const existingWithUsername = await prisma.user.findUnique({ where: { username } });
      if (existingWithUsername) {
        username = `${baseUsername}_${Math.floor(1000 + Math.random() * 9000)}`;
      }

      // Generar contraseña criptográfica aleatoria segura (evita contraseñas predecibles)
      const randomSecret = crypto.randomBytes(32).toString("hex");
      const securePassword = await bcrypt.hash(randomSecret, SALT_ROUNDS);

      user = await prisma.user.create({
        data: {
          username,
          password: securePassword,
          name: name || username,
          email,
          role: Role.CUSTOMER,
          walletBalance: 0.0,
        },
        include: { restaurant: true },
      });
    }

    if (isNewUser && user.email) {
      NotificationService.notifyCustomerWelcome({ id: user.id, name: user.name, email: user.email }).catch(() => {});
    }

    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
        restaurantId: user.restaurantId,
      },
      env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const rawPreferences = (user as any).preferencesJson;
    let preferences: string[] = [];
    if (rawPreferences) {
      try {
        preferences = JSON.parse(rawPreferences);
      } catch (e) {
        preferences = [];
      }
    }

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        cedula: user.cedula || null,
        walletBalance: user.walletBalance,
        isPlus: user.isPlus,
        avatar: avatar || null,
        provider: finalProvider,
        preferences,
      },
    });
  } catch (error: any) {
    console.error("Fallo de seguridad en autenticación social:", error.message);
    return res.status(401).json({
      success: false,
      message: error.message || "Error al verificar credenciales con el proveedor.",
    });
  }
}

export async function savePreferences(req: Request, res: Response, next: NextFunction) {
  try {
    const { preferences } = req.body;
    const userId = req.user?.userId;

    if (userId && preferences && Array.isArray(preferences)) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          preferencesJson: JSON.stringify(preferences),
        } as any,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Preferencias gastronómicas guardadas exitosamente",
      preferences: preferences || [],
    });
  } catch (error) {
    next(error);
  }
}

export async function completeProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const { preferences } = req.body;
    const userId = (req as any).user?.userId;

    if (userId && preferences && Array.isArray(preferences)) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          preferencesJson: JSON.stringify(preferences),
        } as any,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Preferencias guardadas con éxito",
      preferences: preferences || [],
    });
  } catch (error) {
    next(error);
  }
}
