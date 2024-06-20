import express from "express";
import { register,login, verifyOtp } from "../controllers/user/userController";
const router = express.Router();

router.route("/register").post(register)
router.route("/verify-otp").post(verifyOtp)
router.route("/login").post(login)
export default router;
