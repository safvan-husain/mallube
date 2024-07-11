import express from "express";
import { getSubscriptionPlans } from "../controllers/subscription/subscriptionController";

const router = express.Router();

router.route("/").get(getSubscriptionPlans);

export default router;
