import express from "express";
import { addStaff, login ,fetchStaffs,updateStaff, deleteStaff,fetchAllStore, updateSubscription,updateStore,updateStoreStatus, changePassword, addAdvertisement, fetchAllAdvertisement, deleteAdvertisement,updateAdvertisementDisplay, fetchTotalStoreByCategory,addTarget} from "../controllers/admin/adminController";
import { admin } from "../middleware/auth";
const router = express.Router();

router.route("/login").post(login);
router.route('/staff').post(admin,addStaff).get(admin,fetchStaffs).patch(admin,updateStaff);
router.route('/staff/:staffId').delete(admin,deleteStaff);
router.route("/store").get(admin,fetchAllStore);
router.route("/store/subscription").put(admin,updateSubscription);
router.route("/store/:storeId").put(admin,updateStore);
router.route("/store/status-update/:storeId").put(admin,updateStoreStatus);
router.route("/change-password").put(admin,changePassword)
router.route("/advertisement").post(admin,addAdvertisement).get(admin,fetchAllAdvertisement).put(admin,updateAdvertisementDisplay)
router.route("/advertisement/:advertisementId").delete(admin,deleteAdvertisement)
router.route("/total-store").get(admin,fetchTotalStoreByCategory)
router.route("/staff/target").post(admin,addTarget)

export default router;
