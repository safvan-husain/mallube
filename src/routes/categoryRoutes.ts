import express from "express";
import {
  addCategory,
  getActiveMainCategories,
  getActiveSubCategories,
  //   dele,
  getCategories,
  getPendingSubCategories,
  updateCategory,
  deleteCategory,
  getStoreSubCategories,
  deleteCategoryPermenently
  //   getCategoryById,
  //   updateCategory,
} from "../controllers/category/categoryController";
import {
  addCategorySchema,
  updateCategorySchema,
} from "../schemas/category.schemas";
import { validateData } from "../middleware/zod.validation";
import { admin, store } from "../middleware/auth";
// import { staff } from "../middleware/auth";
const router = express.Router();

// need to add middleware here
router
  .route("/")
  .post(addCategory)
  .get(getCategories)
  .delete(admin, deleteCategoryPermenently);

//TODO: remove later.
router.route("/sub").get(store, getStoreSubCategories);

router.route("/pending").get(getPendingSubCategories);

router.route("/main").get(getActiveMainCategories);
router
  .route("/:id")
  .get(getActiveSubCategories)
  .put(updateCategory)
  .delete(deleteCategory);
// router
//   .route("/:id")
//   .get(getProductById)
//   .patch(updateProduct)
//   .delete(deleteProduct);

export default router;
