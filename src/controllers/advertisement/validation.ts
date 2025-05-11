import { z} from 'zod';
import {ObjectIdSchema} from "../../schemas/commom.schema";
import {businessAccountTypeSchema} from "../../schemas/store.schema";
import {Types} from "mongoose";

export const createAdsPlanSchema = z.object({
    name: z.string().min(1),
    price: z.number(),
    offerPrice: z.number().optional(),
    //duration in hours
    duration: z.number(),
    //when radius null, it means unlimited radius.
    maxRadius: z.number().optional(),
    message: z.string().optional(),
    isActive: z.boolean().optional()
});

export const objectIdRequestSchema = z.object({
    advertisementId: ObjectIdSchema
});

//This structure is for the business app owner own ad [add advertisement section]
export const BAppAdvertisementSchema = z.object({
    image: z.string().url(),
    status: z.string(),
    _id: z.string()
})

export type BAppAdvertisement = z.infer<typeof BAppAdvertisementSchema>

export const relevantAdvertisementSchema = z.object({
    image: z.string(),
    type: businessAccountTypeSchema.optional(),
    storeId: z.instanceof(Types.ObjectId).optional()
});