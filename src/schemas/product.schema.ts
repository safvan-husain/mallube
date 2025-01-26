// src/schemas/userSchemas.ts
import { z } from "zod";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE } from "../config/s3";

export const addProductSchema = z
  .object({
    name: z.string().trim().min(1, "product name cannot be empty"),
    images: z.array(z.string()).min(1, "minimum 1 image is required"),
    description: z.string().trim().optional(),
    price: z.number().gte(0, { message: "price cannot be a negative value" }),
    offerPrice: z.optional(z.number()),
    category: z.string(),
    isActive: z.boolean().default(true),
    isPending: z.boolean().default(false).optional(),
    addToCartActive: z.boolean().default(false).optional(),
    isEnquiryAvailable: z.boolean().default(false).optional(),
    store: z.string().optional()
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

export type IAddProductSchema = z.infer<typeof addProductSchema>;

export const uploadProdutImagesSchema = z.object({
  imageUrlsAndNames: z
    .string()
    .transform((value) => JSON.parse(value))
    .refine((value) => {
      try {
        return Array.isArray(value);
      } catch {
        return false;
      }
    }, "imageUrlsAndNames must be a valid JSON array of objects")
    .refine((array) => {
      return array.every(
        (item: { url: string; file: string }) =>
          typeof item.file === "string" || typeof item.url === "string"
      );
    }, "Each item in imageUrlsAndNames must be an object with a file string property"),

  files: z
    .array(
      z.object({
        name: z.string(),
        size: z
          .number()
          .max(MAX_IMAGE_SIZE, `File size must be less than ${MAX_IMAGE_SIZE}`),
        mimetype: z
          .string()
          .refine(
            (type) => ALLOWED_IMAGE_TYPES.includes(type),
            "File type must match allowed types"
          ),
      })
    )
    .optional(),
});

export type IUploadProdutImagesSchema = z.infer<
  typeof uploadProdutImagesSchema
>;

// export const updateCategorySchema = addProductSchema.partial();

// export type IUpdateCategorySchema = z.infer<typeof updateCategorySchema>;
