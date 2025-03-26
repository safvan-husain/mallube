import {z} from "zod";
import {Types} from "mongoose";
import {createdAtIST, getIST} from "../../../utils/ist_time";

const UserProductSchema = z.object({
    name: z.string(),
    images: z.array(z.string()),
    description: z.string(),
    price: z.number(),
    category: z.string().refine((v) => Types.ObjectId.isValid(v), {
        message: "Invalid ObjectId",
    }),
    keyWords: z.string().optional(),
    isShowPhone: z.boolean(),
    locationName: z.string(),
    location: z.object({
        type: z.string().default("Point"),
        coordinates: z.tuple([z.number(), z.number()]),
    }).optional().refine(
        (data) => data?.coordinates?.length === 2,
        "should pass latitude, longitude",
    ),
});

export const locationSchema = z.object({
    latitude: z.string().refine((val) => /^-?\d+(\.\d+)?$/.test(val), {
        message: "must be a valid number"
    }).transform((val) => parseFloat(val)),
    longitude: z.string().refine((val) => /^-?\d+(\.\d+)?$/.test(val), {
        message: "must be a valid number"
    }).transform((val) => parseFloat(val)),
})

const querySchema = z.object({
    searchTerm: z.string().optional(),
    categoryId: z.string().optional(),
    skip: z.string().default('0').transform((val) => parseInt(val, 10)),
    limit: z.string().default('10').transform((val) => parseInt(val, 10))
}).merge(locationSchema);

const UpdateUserProductSchema = UserProductSchema.partial();

const CreateUserProductSchema = UserProductSchema.extend({
    createdAt: z.date().optional().default(createdAtIST),
    expireAt: z.date().optional().default(() => {
        let expireAt = createdAtIST();
        expireAt.setDate(expireAt.getDate() + 30);
        return expireAt;
    }),
    owner: z.instanceof(Types.ObjectId),
});

export {CreateUserProductSchema, UpdateUserProductSchema, querySchema};