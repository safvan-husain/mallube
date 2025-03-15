import { Router } from "express";
import {
    createServiceProfile,
    deleteServiceProfile,
    getServiceCategory,
    getFreelancers,
    getSpecificServiceProfile,
    updateServiceProfile,
    loginServiceProfile
} from "../controllers/service/serviceContoller";
import { serviceIndivdual } from "../middleware/auth";
import { addProduct } from "../controllers/product/productController";

const router = Router();

//only sned neccessary data
router.route('/')
    .get(getFreelancers);
router.route('/login').post(loginServiceProfile);
router.route('/register').post(createServiceProfile);

router.route('/profile').get(serviceIndivdual ,getSpecificServiceProfile);

router.route('/category')
    .get(getServiceCategory)

router.route("/:id")
    .get(getSpecificServiceProfile)
    .put(updateServiceProfile)
    .delete(deleteServiceProfile);
// router.route("/category/position/:id")
//     .put(updateServiceCategoryIndex);

router.route('/product').post(serviceIndivdual, addProduct);

export { router as individualBussinessRoutes };