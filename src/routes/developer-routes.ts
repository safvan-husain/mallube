import { Router } from 'express';
import {updateData} from "../controllers/developer/transform-controller";

const route = Router();

route.route('/transform')
    .get(updateData)

export { route as developerRoute }