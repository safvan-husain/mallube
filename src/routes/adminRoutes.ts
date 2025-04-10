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
import { createNewAdvertisementPlan, deleteAdvertisementPlan } from "../controllers/advertisement/advertisementPlanController";
import {
  appendCategoryToDisplay,
  createDisplayCategory,
  getAdminDisplayCategories, removeCategoryFromDisplay
} from '../controllers/category/categoryController';
import {
  createEmployee, deleteManager,
  getAllEmployeesOfPrivilege,
  getSpecificEmployee, updateEmployee
} from "../controllers/marketting-section/manager/auth-manager-controller";
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
//TODO: add admin middleware for post ads
router
  .route("/advertisement")
  .post(addAdvertisement)
  .get(fetchAllAdvertisement);
//TODO: add admin middleware.
router.route("/advertisement/status").put(updateAdvertisementStatus);


//TODO: add middleware admin.
router.route("/advertisement/plan")
  .post(admin, createNewAdvertisementPlan)
  .delete(admin, deleteAdvertisementPlan);
router
  .route("/advertisement/:advertisementId")
  .delete(admin, deleteAdvertisement);
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

router.route("/category").get(getAdminDisplayCategories).post(createDisplayCategory);
router.route("/category/append").post(appendCategoryToDisplay);
router.route("/category/remove").post(removeCategoryFromDisplay);
//TODO: change in admin web.
router.route('/manager')
    .post(createEmployee)
    .get(getAllEmployeesOfPrivilege)

router.route('/employee')
    .post(createEmployee)
    .get(getAllEmployeesOfPrivilege)

router.route('/manager/:id')
    .get(getSpecificEmployee)
    .put(updateEmployee)
    .delete(deleteManager)

export default router;
