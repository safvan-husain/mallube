import { Router } from "express";
import {
    createNotificationForBusiness,
    createNotificationForUsers, deleteNotification,
    getNotificationsForBusiness, getNotificationsForUser
} from "../controllers/notification/notificationController";

const router = Router();

router.route('/').delete(deleteNotification);

router.route('/user')
    .post(createNotificationForUsers)
    .get(getNotificationsForUser);
router.route('/business')
    .post(createNotificationForBusiness)
    .get(getNotificationsForBusiness);


export { router as notificationRouter };