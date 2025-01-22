
import * as z from "zod";

export const addAdvertisementPlanSchema = z.object({
    name: z.string().min(1, "name cannot be empty"),
    price: z.number().int().positive(),
    duration: z.number().int().positive(),
    maxRadius: z.number().int().positive(),
});

export type IAddAdvertisementPlanSchema = z.infer<typeof addAdvertisementPlanSchema>;