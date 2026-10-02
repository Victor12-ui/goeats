import { Request, Response, NextFunction } from "express";
import { prisma } from "../../config/database";

// DINING AREAS

export async function getDiningAreas(req: Request, res: Response, next: NextFunction) {
  try {
    const restaurantId = req.restaurantId;

    if (!restaurantId) {
      return res.status(400).json({ success: false, message: "Restaurant context is required" });
    }

    const diningAreas = await prisma.diningArea.findMany({
      where: { restaurantId },
      include: {
        tables: true,
      },
    });

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        wifiSsid: true,
        wifiPassword: true,
      },
    });

    return res.status(200).json({ success: true, diningAreas, restaurant });
  } catch (error) {
    next(error);
  }
}

export async function createDiningArea(req: Request, res: Response, next: NextFunction) {
  try {
    const restaurantId = req.restaurantId;
    const { name } = req.body;

    if (!restaurantId) {
      return res.status(400).json({ success: false, message: "Restaurant context is required" });
    }
    if (!name) {
      return res.status(400).json({ success: false, message: "Dining area name is required" });
    }

    const diningArea = await prisma.diningArea.create({
      data: {
        name,
        restaurantId,
      },
    });

    return res.status(201).json({ success: true, message: "Dining area created successfully", diningArea });
  } catch (error) {
    next(error);
  }
}

export async function updateDiningArea(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    const restaurantId = req.restaurantId;
    const { name } = req.body;

    if (isNaN(id) || !restaurantId) {
      return res.status(400).json({ success: false, message: "Invalid ID or restaurant context missing" });
    }

    const area = await prisma.diningArea.findFirst({ where: { id, restaurantId } });
    if (!area) {
      return res.status(404).json({ success: false, message: "Dining area not found in this restaurant" });
    }

    const updatedArea = await prisma.diningArea.update({
      where: { id },
      data: { name },
    });

    return res.status(200).json({ success: true, message: "Dining area updated", diningArea: updatedArea });
  } catch (error) {
    next(error);
  }
}

export async function deleteDiningArea(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    const restaurantId = req.restaurantId;

    if (isNaN(id) || !restaurantId) {
      return res.status(400).json({ success: false, message: "Invalid ID or restaurant context missing" });
    }

    const area = await prisma.diningArea.findFirst({ where: { id, restaurantId } });
    if (!area) {
      return res.status(404).json({ success: false, message: "Dining area not found in this restaurant" });
    }

    await prisma.diningArea.delete({ where: { id } });

    return res.status(200).json({ success: true, message: "Dining area and all its tables deleted successfully" });
  } catch (error) {
    next(error);
  }
}

// TABLES

export async function createTable(req: Request, res: Response, next: NextFunction) {
  try {
    const restaurantId = req.restaurantId;
    const { number, capacity, diningAreaId } = req.body;

    if (!restaurantId) {
      return res.status(400).json({ success: false, message: "Restaurant context is required" });
    }
    if (!number || !diningAreaId) {
      return res.status(400).json({ success: false, message: "Table number and diningAreaId are required" });
    }

    // Verify dining area belongs to restaurant
    const area = await prisma.diningArea.findFirst({
      where: { id: parseInt(diningAreaId, 10), restaurantId },
    });
    if (!area) {
      return res.status(404).json({ success: false, message: "Dining area not found in this restaurant" });
    }

    const table = await prisma.table.create({
      data: {
        number,
        capacity: capacity ? parseInt(capacity, 10) : 4,
        diningAreaId: area.id,
      },
    });

    return res.status(201).json({ success: true, message: "Table created successfully", table });
  } catch (error) {
    next(error);
  }
}

export async function updateTable(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    const restaurantId = req.restaurantId;
    const { number, capacity, status } = req.body;

    if (isNaN(id) || !restaurantId) {
      return res.status(400).json({ success: false, message: "Invalid ID or restaurant context missing" });
    }

    // Verify table belongs to restaurant
    const table = await prisma.table.findFirst({
      where: {
        id,
        diningArea: { restaurantId },
      },
    });
    if (!table) {
      return res.status(404).json({ success: false, message: "Table not found in this restaurant" });
    }

    const updatedTable = await prisma.table.update({
      where: { id },
      data: {
        number,
        capacity: capacity ? parseInt(capacity, 10) : undefined,
        status,
      },
    });

    return res.status(200).json({ success: true, message: "Table updated successfully", table: updatedTable });
  } catch (error) {
    next(error);
  }
}

export async function deleteTable(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    const restaurantId = req.restaurantId;

    if (isNaN(id) || !restaurantId) {
      return res.status(400).json({ success: false, message: "Invalid ID or restaurant context missing" });
    }

    // Verify table belongs to restaurant
    const table = await prisma.table.findFirst({
      where: {
        id,
        diningArea: { restaurantId },
      },
    });
    if (!table) {
      return res.status(404).json({ success: false, message: "Table not found in this restaurant" });
    }

    await prisma.table.delete({ where: { id } });

    return res.status(200).json({ success: true, message: "Table deleted successfully" });
  } catch (error) {
    next(error);
  }
}
