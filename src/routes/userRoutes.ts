import express from "express";
import { register,login, verifyOtp, addToCart, getCart, removeCart,updateProfile } from "../controllers/user/userController";
import { user } from "../middleware/auth";
import { validateData } from "../middleware/zod.validation";
import { addCartSchema } from "../schemas/cart.schema";
const router = express.Router();

router.route("/register").post(register)
router.route("/verify-otp").post(verifyOtp)
router.route("/login").post(login)

router.route("/cart").post(user, validateData(addCartSchema), addToCart)
router.route("/cart/:storeId").get(user, getCart).delete(user, removeCart)
router.route('/update-profile').put(user,updateProfile)
export default router;
