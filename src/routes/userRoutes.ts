import express from "express";
import {
    register,
    login,
    verifyOtp,
    addToCart,
    getCart,
    removeCart,
    updateProfile,
    updateProfilePassword,
    fetchUser,
    fetchTimeSlot,
    slotBooking,
    fetchAllDoctors,
    fetchAllSpecialisations,
    slotBookingV2,
    getAvailableTimeSlotForStoreV2,
    getBookingsV2,
    changePushNotificationStatus,
    getStoreDetails,
    removeProductFromCart,
    deleteUser,
    updateUserFcmToken,
    getBookingHistory, deleteBookingHistory, cancelBooking
} from "../controllers/user/userController";
import { user } from "../middleware/auth";
import { validateData } from "../middleware/zod.validation";
import { addCartSchema } from "../schemas/cart.schema";
import { drBooking } from "../controllers/booking/bookingController";
import { pushNotifcationStatusSchema } from "../schemas/user.schema";
import { getFavoriteFreelancers, getFavoriteShops, toggleFavorite, getFavoriteUserProducts } from "../controllers/user/favourites/favouritesController";
import {changeUserPasswordV2} from "../controllers/user/auth-controller";
const router = express.Router();

router.route("/register").post(register)
router.route("/verify-otp").post(verifyOtp)
router.route("/login").post(login)
router.route('/').delete(user, deleteUser);
router.route("/fcm-token").put(user, updateUserFcmToken);

router.route('/fav').post(user, toggleFavorite)
router.route('/fav/shops').get(user, getFavoriteShops);
router.route('/fav/freelancers').get(user, getFavoriteFreelancers);
router.route('/fav/user-products').get(user, getFavoriteUserProducts);

router.route("/store-details").get(user, getStoreDetails);
router.route("/cart").post(user, validateData(addCartSchema), addToCart).put(user, removeProductFromCart);
router.route("/cart/:storeId").get(user, getCart).delete(user, removeCart)
router.route('/update-profile').put(user,updateProfile)
router.route("/update-password-v2").put(changeUserPasswordV2)
router.route("/change-profile-password").put(user,updateProfilePassword)
router.route("/change-notification-status").put(user, validateData(pushNotifcationStatusSchema), changePushNotificationStatus);
router.route("/fetch-user-details").get(user,fetchUser)
router.route("/time-slots/:id").get(user, fetchTimeSlot)
router.route('/available-time-slots').get(user, getAvailableTimeSlotForStoreV2)
router.route("/booking").post(user,slotBooking)
router.route("/booking-v2").post(user,slotBookingV2).get(user, getBookingsV2)
router.route("/booking-cancel").post(user, cancelBooking)
router.route("/dr-booking").post(user,drBooking)
router.route("/specialisations/:uniqueName").get(fetchAllSpecialisations)
router.route("/doctors/:uniqueName").get(fetchAllDoctors)

router.route('/booking-history')
    .get(user, getBookingHistory)
    .delete(user, deleteBookingHistory);

export default router;
