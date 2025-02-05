import { Router } from "express";
import {
    createNotificationForBusiness,
    createNotificationForUsers, deleteNotification,
    getNotificationsForBusiness, getNotificationsForUser
} from "../controllers/notification/notificationController";
import { admin } from "../middleware/auth";
import Store from "../models/storeModel";

const router = Router();

router.route('/').delete(admin, deleteNotification);

//TODO: add middlewares.
router.route('/user')
    .post(admin, createNotificationForUsers)
    .get(getNotificationsForUser);
router.route('/business')
    .post(createNotificationForBusiness)
    .get(getNotificationsForBusiness);

router.get('/tokens', async (req: any, res: any) => {
    try {
        const stores = Store.find({
            fcmToken: { $exist: true }
        });
        res.status(200).json(stores);
    } catch (error) {
        res.status(500).json({ message: error});
    }
})    


export { router as notificationRouter };