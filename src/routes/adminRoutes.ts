import express from "express";
import {
  addStaff,
  login,
  fetchStaffs,
  updateStaff,
  deleteStaff,
  fetchAllStore,
  updateSubscription,
  updateStore,
  updateStoreStatus,
  changePassword,
  addAdvertisement,
  deleteAdvertisement,
  fetchTotalStoreByCategory,
  addTarget,
  mostSearchedProducts,
  deleteStoreById,
  fetchAllUsers,
  updateUserStatus,
  deleteUser,
  fetchUsersCount,
  fetchAdminDetails,
  getAdminStore
} from "../controllers/admin/adminController";
import { updateAdvertisementStatus, fetchAllAdvertisement } from "../controllers/advertisement/advertisementController";
import { admin } from "../middleware/auth";
import { createNewAdvertisementPlan } from "../controllers/advertisement/advertisementPlanController";
const router = express.Router();

router.route("/login").post(login);
router.route("/fetch-admin-details")
  .get(admin, fetchAdminDetails);
router
  .route("/staff")
  .post(admin, addStaff)
  .get(admin, fetchStaffs)
  .patch(admin, updateStaff);
router.route("/staff/:staffId")
  .delete(admin, deleteStaff);
router.route("/store")
  .get(admin, fetchAllStore);
router.route("/store/subscription")
  .put(admin, updateSubscription);
router.route("/store/:storeId")
  .put(admin, updateStore)
  .delete(admin, deleteStoreById)
  .get(admin, getAdminStore)
router.route("/store/status-update/:storeId")
  .put(admin, updateStoreStatus);
router.route("/change-password")
  .put(admin, changePassword)
router
  .route("/advertisement")
  .post(admin, addAdvertisement)
  .get(admin, fetchAllAdvertisement);
//TODO: add admin middleware.
router.route("/advertisement/status").put(updateAdvertisementStatus);
router
  .route("/advertisement/:advertisementId")
  .delete(admin, deleteAdvertisement);

//TODO: add middleware admin.
router.route("/advertisement/plan")
  .post(createNewAdvertisementPlan);
//TODO: delete plan.
router.route("/total-store")
  .get(admin, fetchTotalStoreByCategory);
router.route("/staff/target")
  .post(admin, addTarget);
router.route("/most-searched-products")
  .get(admin, mostSearchedProducts)
router.route("/fetch-all-users")
  .get(admin, fetchAllUsers)
router.route('/change-user-status')
  .put(admin, updateUserStatus)
router.route("/delete-user/:userId")
  .delete(admin, deleteUser)
router.route("/users-count")
  .get(admin, fetchUsersCount)

export default router;
