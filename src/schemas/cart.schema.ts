// src/schemas/userSchemas.ts
import { Types } from "mongoose";
import { z } from "zod";

export const addCartSchema = z.object({
  productId: z.string().refine((val) => {
    const validType = Types.ObjectId.isValid(val);
    if (!validType) return false;
    return true;
  }),
  quantity: z.number().default(1),
});

export type IAddCartSchema = z.infer<typeof addCartSchema>;
