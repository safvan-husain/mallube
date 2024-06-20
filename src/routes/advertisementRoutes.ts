import express from "express";
import { fetchAllAdvertisement } from "../controllers/advertisement/advertisementController";
const router = express.Router();

router.route("/").get(fetchAllAdvertisement)

export default router;
