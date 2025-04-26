import { Schema, model } from "mongoose";
import {z} from "zod";

export const notificationType = z.enum(['user', 'business', 'partner']);
export type NotificationType = z.infer<typeof notificationType>;

export interface INotificationModel {
    _id?: string;
    title: string;
    description: string;
    isForBusiness: boolean; //false -> for user
    type: NotificationType;
}

const notificationSchema = new Schema<INotificationModel>(
    {
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true
        },
        isForBusiness: {
            type: Boolean,
            required: true
        },
        type: {
            type: String,
            enum: notificationType.enum,
            required: true
        }
    },
    {
        timestamps: true
    }
)

const Notification = model<INotificationModel>('notifications', notificationSchema);

export default Notification;