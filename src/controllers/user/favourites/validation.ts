import { z } from "zod";
import { Types } from "mongoose";

const optionalObjectId = z.string().optional().refine(
    (v) => v === undefined || Types.ObjectId.isValid(v),
    { message: "Invalid ObjectId" }
)
    .transform((v) => (v ? new Types.ObjectId(v) : undefined));

export const UserFavRequestValidationSchema = z.object({
    shopId: optionalObjectId,
    freelancerId: optionalObjectId,
    userProduct: optionalObjectId
}).refine(
    (v) => v.freelancerId || v.shopId || v.userProduct,
    { message: "Either shopId or freelancerId or userProduct is required" }
);