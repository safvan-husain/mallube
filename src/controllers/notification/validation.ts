import { z} from 'zod';
import {notificationType} from "../../models/notificationModel";

export const createNotificationRequestSchema = z.object({
    title: z.string(),
    description: z.string(),
    notificationType: notificationType.default('business')
})