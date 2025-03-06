import { z } from "zod";
import { Types } from 'mongoose';
export const addProductSchema = z
  .object({
    name: z.string().trim().min(1, "product name cannot be empty"),
    images: z.array(z.string()).min(1, "minimum 1 image is required"),
    description: z.string().trim().optional(),
    price: z.number().gte(0, { message: "price cannot be a negative value" }),
    offerPrice: z.optional(z.number()),
    category: z.string().refine((v) => Types.ObjectId.isValid(v), { message: "Invalid category ObjectId"}),
    isActive: z.boolean().default(true),
    isPending: z.boolean().default(false).optional(),
    addToCartActive: z.boolean().default(false).optional(),
    isEnquiryAvailable: z.boolean().default(false).optional(),
    store: z.string().optional(),
    individual: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.offerPrice && data.offerPrice >= data?.price) {
      ctx.addIssue({
        type: "number",
        code: "too_big",
        maximum: data?.price - 1,
        inclusive: false,
        path: ["offerPrice"],
        message: "The offer price should be less than the actual price.",
      });
    }
  });