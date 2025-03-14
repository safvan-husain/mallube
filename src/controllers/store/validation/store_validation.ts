import {z} from "zod";

export const businessAccountTypeSchema = z.enum(['business', 'freelancer']);
export type BusinessAccountType = z.infer<typeof businessAccountTypeSchema>;