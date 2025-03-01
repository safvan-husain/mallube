import { Router } from "express";
import {
    createServiceProfile,
    createServiceCategory,
    deleteServiceProfile,
    deleteServiceCategory,
    getServiceCategory,
    getServices,
    getSpecificServiceProfile,
    updateServiceProfile,
    updateServiceCategory,
    updateServiceCategoryIndex,
    loginServiceProfile
} from "../controllers/service/serviceContoller";
import { serviceIndivdual } from "../middleware/auth";
import { addProduct } from "../controllers/product/productController";

const router = Router();

//only sned neccessary data
router.route('/')
    .get(getServices);
router.route('/login').post(loginServiceProfile);
router.route('/register').post(createServiceProfile);

router.route('/profile').get(serviceIndivdual ,getSpecificServiceProfile);

router.route('/category')
    .get(getServiceCategory)
    .post(createServiceCategory);
router.route("/category/:id")
    .put(updateServiceCategory)
    .delete(deleteServiceCategory);
router.route("/:id")
    .get(getSpecificServiceProfile)
    .put(updateServiceProfile)
    .delete(deleteServiceProfile);
router.route("/category/position/:id")
    .put(updateServiceCategoryIndex);

router.route('/product').post(serviceIndivdual, addProduct);

export { router as individualBussinessRoutes };