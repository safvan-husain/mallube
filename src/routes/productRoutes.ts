import express from "express";
import {
  addProduct,
  deleteProduct,
  deleteProductOfAStore,
  fetchProducts,
  getActiveSubCategories,
  getAllProducts,
  getProductById,
  getProductsOfAStore,
  updateProduct,
} from "../controllers/product/productController";
// import { staff } from "../middleware/auth";
import { validateData } from "../middleware/zod.validation";
import { addProductSchema } from "../schemas/product.schema";
const router = express.Router();


// for main website
router.route("/fetch-products").get(fetchProducts);


// need to add middleware here
router.route("/").get(getAllProducts);
router.route("/category/:shopId").get(getActiveSubCategories);


router
  .route("/:storeId")
  .post(validateData(addProductSchema as any), addProduct)
  .get(getProductsOfAStore)
  .delete(deleteProductOfAStore);

router
  .route("/store/:productId")
  .get(getProductById)
  .put(updateProduct)
  .delete(deleteProduct);


export default router;
