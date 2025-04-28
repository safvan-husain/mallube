import { z } from "zod";
import { Types } from 'mongoose';
import {ObjectIdSchema, paginationSchema} from "../../schemas/commom.schema";
import {locationSchema} from "../user/buy_and_sell/validation";
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

export const nearByOfferProductsRequestSchema = z
    .object({
        category: ObjectIdSchema.optional(),
        searchTerm: z.string().min(2, "Minimum two characters required").optional()
    })
    .merge(paginationSchema)
    .merge(locationSchema)

export const productUserResponseSchema = z.object({
    isEnquiryAvailable: z.boolean(),
    _id: z.string(),             // corresponds to id
    name: z.string(),
    images: z.array(z.string()),
    description: z.string(),
    price: z.number().int(),      // Dart's int -> JS number (integer)
    offerPrice: z.number().int(),
    category: z.string(),
    store: z.object({
        _id: z.string(),
        storeName: z.string(),
    }).nullable(),  // because in Dart it's `SubStoreModel?`
    stock: z.boolean(),
    addToCartActive: z.boolean(),
});

export type ProductUserResponse = z.infer<typeof productUserResponseSchema>;

export const getProductsOfAStoreRequestSchema = z.object({
    storeId: z.string().optional(),
    category: ObjectIdSchema.optional(),
}).merge(paginationSchema);