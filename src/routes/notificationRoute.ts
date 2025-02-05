import { Router } from "express";
import {
    createNotificationForBusiness,
    createNotificationForUsers, deleteNotification,
    getNotificationsForBusiness, getNotificationsForUser
} from "../controllers/notification/notificationController";
import { admin } from "../middleware/auth";

const router = Router();

router.route('/').delete(admin, deleteNotification);

router.route('/user')
    .post(admin, createNotificationForUsers)
    .get(getNotificationsForUser);
router.route('/business')
    .post(admin, createNotificationForBusiness)
    .get(getNotificationsForBusiness);


export { router as notificationRouter };