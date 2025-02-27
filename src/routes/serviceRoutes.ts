import { Router } from "express";
import {
    createService,
    createServiceCategory,
    deleteService,
    deleteServiceCategory,
    getServiceCategory,
    getServices,
    getSpecificService,
    updateService,
    updateServiceCategory,
    updateServiceCategoryIndex
} from "../controllers/service/serviceContoller";

const router = Router();

//only sned neccessary data
router.route('/')
    .get(getServices)
    .post(createService);

router.route('/category')
    .get(getServiceCategory)
    .post(createServiceCategory);
router.route("/category/:id")
    .put(updateServiceCategory)
    .delete(deleteServiceCategory);
router.route("/:id")
    .get(getSpecificService)
    .put(updateService)
    .delete(deleteService);
router.route("/category/position/:id")
    .put(updateServiceCategoryIndex);

export { router as serviceRoutes };