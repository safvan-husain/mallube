import express from "express";
import { fetchAllAdvertisement, fetchRelaventAdvertisement } from "../controllers/advertisement/advertisementController";
import { fetchAllAdvertisementPlan } from "../controllers/advertisement/advertisementPlanController";
const router = express.Router();


router.route("/").get(fetchRelaventAdvertisement);

router.route("/all-items").get(fetchAllAdvertisement);

router.route("/plan").get(fetchAllAdvertisementPlan)

export default router;
