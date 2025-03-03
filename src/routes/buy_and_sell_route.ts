import { Request, Response, Router } from "express";
import { UploadedFile } from "express-fileupload";
import asyncHandler from "express-async-handler";
import mongoose, { Types, Schema } from "mongoose";
import { createUserPoduct, deleteUserProduct, getUserProducts, updateUserProduct } from "../controllers/buy_and_sell/buy_and_sellController";
import { user } from "../middleware/auth";

const router = Router();

router.route('/')
    .get(getUserProducts)
    .post(user, createUserPoduct);
router.route('/:id')
    .put(updateUserProduct)
    .delete(deleteUserProduct);

export { router as buyAndSellRouter };