import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth";
import { authorize } from "../../middlewares/rbac";
import { Role } from "@prisma/client";
import {
  getPublicCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
} from "./saas-categories.controller";

const router = Router();

// Public route to retrieve all categories & subcategories
router.get("/", getPublicCategories);

// Protected routes (SuperAdmin only)
router.use(authMiddleware);
router.use(authorize([Role.SUPER_ADMIN]));

router.post("/", createCategory);
router.put("/:id", updateCategory);
router.delete("/:id", deleteCategory);

router.post("/:categoryId/subcategories", createSubcategory);
router.put("/subcategories/:id", updateSubcategory);
router.delete("/subcategories/:id", deleteSubcategory);

export default router;
