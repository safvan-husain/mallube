import { Router } from "express";
import {otpVerifyV2, sendOtpV2} from "../controllers/otp-verification/otp-verification-controller";

const router = Router();

router.route('/send').post(sendOtpV2);
router.route('/verify').post(otpVerifyV2);

export { router as otpRouter };