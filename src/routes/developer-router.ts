
import {Router} from "express";
import {updateData} from "../controllers/developer/transform-controller";

const router = Router();

router.route('/transform').get(updateData);

export {router as developerRouter};
