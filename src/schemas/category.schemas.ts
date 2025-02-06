// src/schemas/userSchemas.ts
import { Types } from "mongoose";
import { z } from "zod";
import { isParentCategory } from "../service/category";

const addCategory = z.object({
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
  icon: z.string().optional(),
  subCategoryType: z.string().optional(),
});

export const addCategorySchema = addCategory.refine(
  (val) => {
    if (!val.parentId && !val.icon) {
      return false;
    }
    return true;
  },
  {
    message: "Icon shouldn't be empty for main category",
    path: ["icon"],
  }
);

export type IAddCategorySchema = z.infer<typeof addCategorySchema>;

export const updateCategorySchema = addCategory
  .extend({
    isShowOnHomePage: z.boolean().default(false),
    isPending: z.boolean().default(false),
  })
  .partial();

export type IUpdateCategorySchema = z.infer<typeof updateCategorySchema>;
