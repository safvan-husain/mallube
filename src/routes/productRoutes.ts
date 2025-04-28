import express from "express";
import {
  addProduct,
  deleteProduct,
  deleteProductOfAStore,
  fetchProducts,
  getAllSubCategories,
  getAllProducts,
  getProductById,
  getProductsOfAStore,
  updateProduct,
  uploadProductImages,
  addVisitors,
  getNearbyProductsWithOffer,
  fetchProductsV2,
} from "../controllers/product/productController";
// import { staff } from "../middleware/authentication";
import { validateData } from "../middleware/zod.validation";
import {
  addProductSchema,
  uploadProdutImagesSchema,
} from "../schemas/product.schema";
import { store } from "../middleware/auth";
import { storeSubscription } from "../middleware/store-subscription.middleware";
const router = express.Router();

// for main website
router.route("/fetch-products").get(fetchProducts);
//used by user app.
router.route("/fetch-products-v2").get(fetchProductsV2);

//TODO: need to add middleware here
router.route("/").get(getAllProducts);
router.route("/category/:shopId").get(getAllSubCategories);
router.route("/near-by-offers").get(getNearbyProductsWithOffer);

router
  .route("/:storeId")
  .post(validateData(addProductSchema as any), addProduct)
  .get(getProductsOfAStore)
  .delete(deleteProductOfAStore);

router
  .route("/images/upload")
  .post(
    store,
    validateData(uploadProdutImagesSchema),
    storeSubscription,
    uploadProductImages
  );


router
  .route("/store/:productId")
  .get(getProductById)
  .put(updateProduct)
  .delete(deleteProduct);

router.route("/addVisitors/:userId/:shopId").get(addVisitors);

export default router;
