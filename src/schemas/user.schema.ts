import { z } from 'zod';
export const pushNotifcationStatusSchema = z.object({
    status: z.boolean()
})