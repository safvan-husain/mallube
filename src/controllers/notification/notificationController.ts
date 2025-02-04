import { Request, Response } from "express";
import { messaging } from 'firebase-admin';
import asyncHandler from "express-async-handler";
import Notification from "../../models/notificationModel";
import User from "../../models/userModel";
import Store from "../../models/storeModel";


export const getNotificationsForBusiness = asyncHandler(
    async (req: Request, res: Response) => {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const skip = (page - 1) * limit;

            const { notifications, count: total } = await getNotificationsAndCount({
                limit,
                skip,
                isForBusiness: true
            })
            res.status(200).json({
                notifications,
                currentPage: page,
                totalItems: total,
            });
        } catch (error) {
            console.log("error ar getNotification", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });

export const getNotificationsForUser = asyncHandler(
    async (req: Request, res: Response) => {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const skip = (page - 1) * limit;

            const { notifications, count: total } = await getNotificationsAndCount({
                limit,
                skip,
                isForBusiness: false
            })
            res.status(200).json({
                notifications,
                currentPage: page,
                totalItems: total,
            });
        } catch (error) {
            console.log("error ar getNotification", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });


export const createNotificationForUsers = asyncHandler(
    async (req: Request, res: Response) => {
        try {
            const { title, description } = req.body;
            const notification = await createNotification({
                title,
                description,
                isForBusiness: false
            });
            sendPushNotifications({
                title,
                body: description,
                isForBusiness: false
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
            const { title, description } = req.body;
            const notification = await createNotification({
                title,
                description,
                isForBusiness: true
            });
            sendPushNotifications({
                title,
                body: description,
                isForBusiness: true
            });
            res.status(201).json({ message: "Successfully created notification", notification });
        } catch (error) {
            console.log("error ar postNotification", error);
            res.status(500).json({ message: "Internal server error" });
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


const createNotification = async ({ title, description, isForBusiness }
    : { title: string, description: string, isForBusiness: boolean }) => {
    var notification = new Notification({
        title,
        description,
        isForBusiness
    });
    return await notification.save();
}

const getNotificationsAndCount = async ({ limit, skip, isForBusiness }: { limit: number, skip: number, isForBusiness: boolean })
    : Promise<{ count: number, notifications: any[] }> => {
    const notifications = await Notification.find({
        isForBusiness
    })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
    const totalCount = await Notification.countDocuments({
        isForBusiness
    })

    return { notifications, count: totalCount };
}

const sendPushNotifications = async ({ title, body, isForBusiness }: { title: string, body: string, isForBusiness: boolean }) => {
    try {
        let fcmTokens;
        if (isForBusiness) {
            fcmTokens = await Store.find({ fcmToken: { $exists: true } }, 'fcmToken').lean() as string[];
        } else {
            fcmTokens = await User.find({ fcmToken: { $exists: true } }, 'fcmToken').lean() as string[];
        }
        for (let i = 0; i < fcmTokens.length; i += 100) {
            const chunk = fcmTokens.slice(i, i + 100);
            messaging().sendEachForMulticast({
                data: {
                    title,
                    body
                },
                tokens: chunk
            }).then((response) => {
                console.log('Multicast notification sent:', response);
            })
                .catch((error) => {
                    console.error('Error sending multicast notification:', error);
                });
        }
    } catch (error) {
        console.log("error at sendPushNotificationToUsers", error);
    }
}