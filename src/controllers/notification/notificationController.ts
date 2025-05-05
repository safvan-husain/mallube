import { Request, Response } from "express";
import { messaging } from 'firebase-admin';
import asyncHandler from "express-async-handler";
import Notification, {NotificationType} from "../../models/notificationModel";
import User from "../../models/userModel";
import Store from "../../models/storeModel";
import {createNotificationRequestSchema} from "./validation";
import {Partner} from "../../models/Partner";
import {onCatchError} from "../../error/onCatchError";
import {paginationSchema} from "../../schemas/commom.schema";
import {errorLogger, logger} from "../../config/logger";

export const getNotificationsForBusiness = asyncHandler(
    async (req: Request, res: Response) => {
        try {
            const { skip, limit } = paginationSchema.parse(req.query);
            const { notifications, count: total } = await getNotificationsAndCount({
                limit,
                skip,
                notificationType: 'business'
            })
            res.status(200).json({
                notifications,
                totalItems: total,
            });
        } catch (error) {
            onCatchError(error, res);
        }
    });

export const getNotificationsForUser = asyncHandler(
    async (req: Request, res: Response) => {
        try {
            const { skip, limit } = paginationSchema.parse(req.query);
            const { notifications, count: total } = await getNotificationsAndCount({
                limit,
                skip,
                notificationType: 'user'
            })
            res.status(200).json({
                notifications,
                totalItems: total,
            });
        } catch (error) {
            onCatchError(error, res);
        }
    });

export const getNotificationsForPartner = asyncHandler(
    async (req: Request, res: Response) => {
        try {
            const { skip, limit } = paginationSchema.parse(req.query);
            const { notifications, count: total } = await getNotificationsAndCount({
                limit,
                skip,
                notificationType: 'partner'
            })
            res.status(200).json({
                notifications,
                totalItems: total,
            });
        } catch (error) {
            onCatchError(error, res);
        }
    });


export const createNotificationForUsers = asyncHandler(
    async (req: Request, res: Response) => {
        try {
            const { title, description } = req.body;
            const notification = await createNotification({
                title,
                description,
                isForBusiness: false,
                notificationType: 'user'
            });
            await sendPushNotifications({
                title,
                body: description,
                notificationType: 'user'
            });
            res.status(201).json({ message: "Successfully created notification", notification });
        } catch (error) {
            console.log("error ar postNotification", error);
            res.status(500).json({ message: "Internal server error" });
        }
    }
)

export const createNotificationForBusiness = asyncHandler(
    async (req: Request, res: Response) => {
        try {
            const { title, description, notificationType } = createNotificationRequestSchema.parse(req.body);
            const notification = await createNotification({
                title,
                description,
                isForBusiness: true,
                notificationType
            });
            await sendPushNotifications({
                title,
                body: description,
                notificationType
            });
            res.status(201).json({ message: "Successfully created notification", notification });
        } catch (error) {
            onCatchError(error, res);
        }
    }
)

export const deleteNotification = asyncHandler(
    async (req: Request, res: Response) => {
        try {
            var notification = await Notification.findById(req.query.notificationId);
            if (!notification) {
                res.status(401).json({ message: "Notification not found" });
                return;
            }
            await Notification.findByIdAndDelete(req.query.notificationId);
            res.status(201).json({ message: "Successfully created notification" });
        } catch (error) {
            console.log("error ar postNotification", error);
            res.status(500).json({ message: "Internal server error" });
        }
    }
)

const createNotification = async ({ title, description, isForBusiness, notificationType }
    : { title: string, description: string, isForBusiness: boolean, notificationType: string }) => {
    var notification = new Notification({
        title,
        description,
        isForBusiness,
        type: notificationType
    });
    return await notification.save();
}

const getNotificationsAndCount = async ({ limit, skip, notificationType }: { limit: number, skip: number, notificationType: NotificationType })
    : Promise<{ count: number, notifications: any[] }> => {
    const notifications = await Notification.find({
        type: notificationType
    })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
    const totalCount = await Notification.countDocuments({
        type: notificationType
    })
    return { notifications, count: totalCount };
}

const sendPushNotifications = async ({ title, body, notificationType }: { title: string, body: string, notificationType: NotificationType }) => {
    try {
        let result;

        switch (notificationType) {
            case 'partner':
                result = await Partner.find({ fcmToken: { $exists: false }, pushNotificationStatus: true }, { fcmToken: true }).lean<{ fcmToken: string}[]>();
                break;
            case 'business':
                result = await Store.find({ fcmToken: { $exists: true } }, 'fcmToken').lean() as { fcmToken: string }[];
                break;
            case 'user':
                result = await User.find({ fcmToken: { $exists: true }, isPushNotificationEnabled: true }, 'fcmToken').lean() as { fcmToken: string }[];
        }

        for (let i = 0; i < result.length; i += 100) {
            const chunk = result.slice(i, i + 100);
            messaging().sendEachForMulticast({
                data: {
                    title,
                    body
                },
                tokens: chunk.map(e => e.fcmToken)
        }).then((response: any) => {
            logger.info('Multicast notification sent:', response);
        })
            .catch((error) => {
                errorLogger(error)
            });
        }
    } catch (error) {
        errorLogger("error at sendPushNotificationToUsers", error);
    }
}