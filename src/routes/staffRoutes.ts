import express from "express";
import {
  login,
  addStore,
  searchUniqueNameExitst,
  fetchAllStore,
  updateStoreStatus,
  updateStore,
  changePassword,
  getStaffById,
  deleteStore,
  forgotPasswordOtpSendToPhone,
  OtpVerify,
  updatePassword,
} from "../controllers/staff/staffController";
import { staff } from "../middleware/auth";
import { validateData } from "../middleware/zod.validation";
import {
  addCategorySchema,
  updateCategorySchema,
} from "../schemas/category.schemas";
import {
  addCategory,
  getActiveSubCategories,
  getCategories,
  updateCategory,
} from "../controllers/category/categoryController";
const router = express.Router();

router.route("/login").post(login);
router.route("/add-store").post(staff, addStore);
router.route("/store/:uniqueName").get(searchUniqueNameExitst);
router.route("/store").get(staff, fetchAllStore);
router.route("/store/status-update/:storeId").put(staff, updateStoreStatus);
router
  .route("/store/:storeId")
  .put(staff, updateStore)
  .delete(staff, deleteStore);
router
  .route("/category")
  .post(validateData(addCategorySchema), staff, addCategory)
  .get(staff, getCategories);
router
  .route("/category/:id")
  .get(staff, getActiveSubCategories)
  .put(validateData(updateCategorySchema), staff, updateCategory);
router.route("/change-password").put(staff, changePassword);
router.route("/").get(staff, getStaffById);
router.route("/otp-send-forgot-password").post(forgotPasswordOtpSendToPhone);
router.route("/otp-verify-forgot-password").post(OtpVerify);
router.route("/update-password-request").put(updatePassword);

export default router;
