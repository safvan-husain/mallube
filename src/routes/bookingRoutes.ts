import express from "express";
import { store } from "../middleware/auth";
import { fetchBookingList } from "../controllers/booking/bookingController";

const router = express.Router();

router.route('/fetch-bookings').get(store,fetchBookingList)
 
export default router; 
