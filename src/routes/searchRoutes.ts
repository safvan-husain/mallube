import asyncHandler from "express-async-handler";
import { Request, Response, Router } from "express";
import ProductSearch from "../models/productSearch";
import Product from "../models/productModel";
import Category from "../models/categoryModel";
import Store from "../models/storeModel";
import { searchStoresByProductNameV2 } from "../controllers/store/storeController";

const router = Router();

router.route('/').get(searchStoresByProductNameV2);

export { router as searchRouter };