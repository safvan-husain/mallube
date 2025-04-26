import { Router } from "express";
import {
    loginPartner,
    changePassword,
    updateFcmToken, businessGraph, getBusinesses, updatePushNotificationStatus
} from "../controllers/marketting-section/partner/partner-controller";
import {partnerProtect} from "../middleware/authentication/partnerProtect";
import {getNotificationsForPartner} from "../controllers/notification/notificationController";

const router = Router();

router.route('/login')
    .post(loginPartner)

router.route('/reset-password')
    .post(partnerProtect, changePassword)

router.route('/fcm-token')
    .post(partnerProtect, updateFcmToken)

router.route('/graph')
    .get(partnerProtect, businessGraph)

router.route('/business')
    .get(partnerProtect, getBusinesses)

router.route('/push-notification-status')
    .put(partnerProtect, updatePushNotificationStatus)

router.route('/notifications')
    .get(partnerProtect, getNotificationsForPartner)

export { router as partnerRoute }