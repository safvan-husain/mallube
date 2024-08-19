import express from "express";
import {
  login,
  fetchStore,
  updateLiveStatus,
  AddAdvertisement,
  deleteAdvertisement,
  fetchAllAdvertisement,
  fetchStoresNearBy,
  fetchStoreByUniqueName,
  fetchAllStore,
  fetchStoreByCategory,
  searchStoresByProductName,
  changePassword,
  forgotPasswordOtpSendToPhone,
  OtpVerify,
  updatePassword,
  updateStoreProfile,
  addTimeSlot,
  fetchTimeSlot,
  deleteTimeSlots,
  stockUpdate
} from "../controllers/store/storeController";
import { store } from "../middleware/auth";
import { addSpecialisation, fetchAllSpecialisation } from "../controllers/specialisation/specialisationController";
import { addDoctor, changeDrAvailability, deleteDoctor, fetchAllDoctors } from "../controllers/doctor/doctorController";
const router = express.Router();

router.route("/login").post(login);
// need to add store authentication middleware
router.route("/").get(store, fetchStore).put(store, updateStoreProfile);
router.route("/search-stores").get(searchStoresByProductName);
router.route("/fetch-store-by-category").get(fetchStoreByCategory);
router.route("/fetch-all-stores").get(fetchAllStore);
router.route("/update-live-status").put(store, updateLiveStatus);
router
  .route("/advertisement")
  .post(store, AddAdvertisement)
  .delete(store, deleteAdvertisement)
  .get(store, fetchAllAdvertisement);
router
  .route("/advertisement/:advertisementId")
  .delete(store, deleteAdvertisement);
router.route("/near-by-shop/:longitude/:latitude").get(fetchStoresNearBy);
router.route("/change-password").put(store, changePassword);
router.route("/otp-send-forgot-password").post(forgotPasswordOtpSendToPhone);
router.route("/otp-verify-forgot-password").post(OtpVerify);
router.route("/update-password-request").put(updatePassword);
router.route("/time-slots").post(store,addTimeSlot).get(store,fetchTimeSlot).delete(store,deleteTimeSlots)
router.route("/update-product-stock").put(store,stockUpdate)
router.route("/specialisation").get(store,fetchAllSpecialisation).post(addSpecialisation)
router.route("/doctor").post(store,addDoctor).delete(store,deleteDoctor)
router.route("/fetch-all-doctors").get(store,fetchAllDoctors)
router.route("/change-dr-availability").put(store,changeDrAvailability)
router.route("/:uniqueName").get(fetchStoreByUniqueName);


export default router;
