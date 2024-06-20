// src/schemas/userSchemas.ts
import { z } from "zod";

export const addProductSchema = z
  .object({
    name: z.string().trim().min(1, "product name cannot be empty"),
    images: z
      .array(z.string())
      .min(1, "minimum 1 image is required")
      .max(3, "maximum 3 images only"),
    description: z.string().trim().optional(),
    price: z.number().positive(),
    offerPrice: z.optional(z.number()),
    category: z.string(),
    isActive: z.boolean().default(true),
    isPending: z.boolean().default(false).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.offerPrice && data.offerPrice >= data.price) {
      ctx.addIssue({
        type: "number",
        code: "too_big",
        maximum: data.price - 1,
        inclusive: false,
        path: ["offerPrice"],
        message: "The offer price should be less than the actual price.",
      });
    }
  });

export type IAddProductSchema = z.infer<typeof addProductSchema>;

// export const updateCategorySchema = addProductSchema.partial();

// export type IUpdateCategorySchema = z.infer<typeof updateCategorySchema>;
