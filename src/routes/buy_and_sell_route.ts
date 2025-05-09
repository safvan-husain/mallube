import { Request, Response, Router } from "express";
import { UploadedFile } from "express-fileupload";
import asyncHandler from "express-async-handler";
import mongoose, { Types, Schema } from "mongoose";
import { createUserPoduct, deleteUserProduct, getUserProducts, updateUserProduct, getUserProductsCategories, getUserMyAds } from "../controllers/user/buy_and_sell/buy_and_sellController";
import {protect, user} from "../middleware/auth";

const router = Router();

router.route('/')
    .get(protect(false), getUserProducts)
    .post(user, createUserPoduct);
router.route('/myads')
    .get(user, getUserMyAds);
router.route('/categories')
    .get(getUserProductsCategories);
router.route('/:id')
    .put(updateUserProduct)
    .delete(deleteUserProduct);

export { router as buyAndSellRouter };