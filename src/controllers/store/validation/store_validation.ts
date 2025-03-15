import {z} from "zod";

export const businessAccountTypeSchema = z.enum(['business', 'freelancer']);
export type BusinessAccountType = z.infer<typeof businessAccountTypeSchema>;

export const createStoreValidation = z.object({
    type: businessAccountTypeSchema.default('business'),
    isDeliveryAvailable: z.boolean().default(false),
    deliveryRadius: z.number().optional(),
});