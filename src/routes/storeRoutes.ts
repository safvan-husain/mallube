import express from "express";
import { login ,fetchStore,updateLiveStatus,AddAdvertisement, deleteAdvertisement, fetchAllAdvertisement, fetchStoresNearBy,fetchStoreByUniqueName, fetchAllStore, fetchStoreByCategory, searchStoresByProductName, changePassword } from "../controllers/store/storeController";
import { store } from "../middleware/auth";
const router = express.Router();

router.route('/login').post(login)
// need to add store authentication middleware
router.route("/").get(store,fetchStore)
router.route("/search-stores").get(searchStoresByProductName)
router.route("/fetch-store-by-category").get(fetchStoreByCategory)
router.route("/fetch-all-stores").get(fetchAllStore)
router.route('/update-live-status').put(store,updateLiveStatus)
router.route("/advertisement").post(store,AddAdvertisement).delete(store,deleteAdvertisement).get(store,fetchAllAdvertisement)
router.route("/advertisement/:advertisementId").delete(store,deleteAdvertisement)
router.route("/near-by-shop/:longitude/:latitude").get(fetchStoresNearBy)
router.route("/:uniqueName").get(fetchStoreByUniqueName)
router.route("/change-password").put(store,changePassword)
export default router;