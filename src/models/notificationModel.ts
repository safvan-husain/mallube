import { Schema, model } from "mongoose";

export interface INotificationModel {
    _id?: string;
    title: string;
    description: string;
    isForBusiness: boolean; //false -> for user
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
        }
    },
    {
        timestamps: true
    }
)

const Notification = model<INotificationModel>('notifications', notificationSchema);

export default Notification;