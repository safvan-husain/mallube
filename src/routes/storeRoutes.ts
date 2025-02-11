import express from "express";
import {
  login,
  signup,
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
  stockUpdate,
  getProfile,
  deleteStore,
  updateFcmToken
} from "../controllers/store/storeController";
import { store } from "../middleware/auth";
import { addSpecialisation, fetchAllSpecialisation } from "../controllers/specialisation/specialisationController";
import { addDoctor, changeDrAvailability, deleteDoctor, fetchAllDoctors } from "../controllers/doctor/doctorController";
import { addProduct, deleteProductOfAStore, getProductsOfAStore, switchStockStatusOfAProduct, updateProduct } from "../controllers/product/productController";
import { rePublishRequestAnAdvertisement } from "../controllers/advertisement/advertisementController";
import { createNote, deleteNote, getNotesForStore, updateNote } from "../controllers/store/notes_controller";
import { createBillForCustomer, createCustomer, deleteCustomer, deleteSelectedBills, getAllCustomers, getCustomerPurchaseHistory, getSpecificBill, markRecievedPayment, updateCustomer, updateSpecificBill } from "../controllers/store/pattu_book_controller";
const router = express.Router();

router.route("/login").post(login);
router.route("/signup").post(signup);
router.route("/profile").get(store, getProfile);
router.route("/fcm-token").put(store, updateFcmToken);
// router.route("/edit-profile").put(store, updateStoreProfile);
// need to add store authentication middleware
router.route("/")
  .get(store, fetchStore)
  .put(store, updateStoreProfile)
  .delete(store, deleteStore);

router.route('/note')
  .get(store, getNotesForStore)
  .post(store, createNote)
  .put(store, updateNote)
  .delete(store, deleteNote);

router.route('/customer')
  .get(store, getAllCustomers)
  .post(store, createCustomer)
  .put(store, updateCustomer)
  .delete(store, deleteCustomer)

router.route('/customer/bill')
  .get(store, getSpecificBill)
  .post(store, createBillForCustomer)
  .put(store, updateSpecificBill)
  .delete(store, deleteSelectedBills)

router.route('/customer/history')
  .get(store, getCustomerPurchaseHistory);

router.route('/customer/mark-recieved-payment').post(store, markRecievedPayment)

router.route("/search-stores").get(searchStoresByProductName);
router.route("/fetch-store-by-category").get(fetchStoreByCategory);
router.route("/fetch-all-stores").get(fetchAllStore);
router.route("/update-live-status").put(store, updateLiveStatus);
router
  .route("/advertisement")
  .post(store, AddAdvertisement)
  // .delete(store, deleteAdvertisement)
  .get(store, fetchAllAdvertisement);
router.route("/advertisement/republish").put(store, rePublishRequestAnAdvertisement);
router
  .route("/advertisement/:advertisementId")
  .delete(store, deleteAdvertisement);
router.route("/near-by-shop/:longitude/:latitude").get(fetchStoresNearBy);
router.route("/change-password").put(store, changePassword);
router.route("/otp-send-forgot-password").post(forgotPasswordOtpSendToPhone);
router.route("/otp-verify-forgot-password").post(OtpVerify);
router.route("/update-password-request").put(updatePassword);
router.route("/time-slots").post(store, addTimeSlot).get(store, fetchTimeSlot).delete(store, deleteTimeSlots)
router.route("/update-product-stock").put(store, stockUpdate)
router.route("/specialisation").get(store, fetchAllSpecialisation).post(addSpecialisation)
router.route("/doctor").post(store, addDoctor).delete(store, deleteDoctor)
router.route("/fetch-all-doctors").get(store, fetchAllDoctors)
router.route("/change-dr-availability").put(store, changeDrAvailability)
router.route("/product")
  .post(store, addProduct)
  .get(store, getProductsOfAStore)
  .delete(store, deleteProductOfAStore)
  .put(store, updateProduct);
router.route("/product/stock-status").put(store, switchStockStatusOfAProduct);
router.route("/:uniqueName").get(fetchStoreByUniqueName);


export default router;
