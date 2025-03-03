import { z } from "zod";
import { Types } from "mongoose";
import { createdAtIST, getIST } from "../../utils/ist_time";

const UserProductSchema = z.object({
    name: z.string(),
    images: z.array(z.string()),
    description: z.string().optional(),
    price: z.number(),
    category: z.string().refine((v) => Types.ObjectId.isValid(v), {
        message: "Invalid ObjectId",
    }),
    owner: z.instanceof(Types.ObjectId),
    keyWords: z.array(z.string()),
    isShowPhone: z.boolean(),
    location: z.object({
        type: z.string().default("Point"),
        coordinates: z.tuple([z.number(), z.number()]),
    }).optional().refine(
        (data) => data?.coordinates?.length === 2,
        "should pass latitude, longitude",
    ),
    createdAt: z.date().optional().default(createdAtIST),
});

const querySchema = z.object({
  searchTerm: z.string().optional(),
  latitude: z.string().optional().transform((val) => val ? parseFloat(val) : undefined),
  longitude: z.string().optional().transform((val) => val ? parseFloat(val) : undefined),
  categoryId: z.string().optional(),
  skip: z.string().default('0').transform((val) => parseInt(val, 10)),
  limit: z.string().default('10').transform((val) => parseInt(val, 10))
});

const UpdateUserProductSchema = UserProductSchema.partial();

export { UserProductSchema, UpdateUserProductSchema, querySchema };