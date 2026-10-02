import { Request, Response, NextFunction } from "express";
import { prisma } from "../../config/database";

export async function getPublicCategories(req: Request, res: Response, next: NextFunction) {
  try {
    const categories = await prisma.saaSCategory.findMany({
      include: {
        subcategories: true,
      },
      orderBy: { name: "asc" },
    });
    return res.status(200).json({ success: true, categories });
  } catch (error) {
    next(error);
  }
}

export async function createCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: "Category name is required" });
    }
    const category = await prisma.saaSCategory.create({
      data: { name, description },
    });
    return res.status(201).json({ success: true, category });
  } catch (error) {
    next(error);
  }
}

export async function updateCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, description } = req.body;
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: "Invalid category ID" });
    }
    if (!name) {
      return res.status(400).json({ success: false, message: "Category name is required" });
    }
    const category = await prisma.saaSCategory.update({
      where: { id },
      data: { name, description },
    });
    return res.status(200).json({ success: true, category });
  } catch (error) {
    next(error);
  }
}

export async function deleteCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: "Invalid category ID" });
    }
    await prisma.saaSCategory.delete({
      where: { id },
    });
    return res.status(200).json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    next(error);
  }
}

export async function createSubcategory(req: Request, res: Response, next: NextFunction) {
  try {
    const categoryId = parseInt(req.params.categoryId, 10);
    const { name } = req.body;
    if (isNaN(categoryId)) {
      return res.status(400).json({ success: false, message: "Invalid category ID" });
    }
    if (!name) {
      return res.status(400).json({ success: false, message: "Subcategory name is required" });
    }
    const subcategory = await prisma.saaSSubcategory.create({
      data: { name, categoryId },
    });
    return res.status(201).json({ success: true, subcategory });
  } catch (error) {
    next(error);
  }
}

export async function updateSubcategory(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    const { name } = req.body;
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: "Invalid subcategory ID" });
    }
    if (!name) {
      return res.status(400).json({ success: false, message: "Subcategory name is required" });
    }
    const subcategory = await prisma.saaSSubcategory.update({
      where: { id },
      data: { name },
    });
    return res.status(200).json({ success: true, subcategory });
  } catch (error) {
    next(error);
  }
}

export async function deleteSubcategory(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: "Invalid subcategory ID" });
    }
    await prisma.saaSSubcategory.delete({
      where: { id },
    });
    return res.status(200).json({ success: true, message: "Subcategory deleted successfully" });
  } catch (error) {
    next(error);
  }
}
