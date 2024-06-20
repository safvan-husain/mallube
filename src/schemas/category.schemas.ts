// src/schemas/userSchemas.ts
import { Types } from "mongoose";
import { z } from "zod";
import { isParentCategory } from "../service/category";

export const addCategorySchema = z.object({
  name: z.string().min(1, "category name cannot be empty"),
  parentId: z
    .string()
    .optional()
    .refine((val) => {
      if (val === undefined) return true;

      const validType = Types.ObjectId.isValid(val);
      if (!validType) return false;

      return isParentCategory(val);
    }),
  isActive: z.boolean(),
  icon:z.string()
});

export type IAddCategorySchema = z.infer<typeof addCategorySchema>;

export const updateCategorySchema = addCategorySchema
  .extend({
    isShowOnHomePage: z.boolean().default(false),
    isPending: z.boolean().default(false),
  })
  .omit({ parentId: true })
  .partial();

export type IUpdateCategorySchema = z.infer<typeof updateCategorySchema>;
