import { z } from "zod";
import { Types } from 'mongoose';
import { isParentCategory } from "../../service/category";

export const addCategorySchema = z
    .object({
        name: z.string().min(1, "category name cannot be empty"),
        parentId: z
            .string()
            .optional()
            .refine((val) => {
                if (val === undefined) return true;
                return Types.ObjectId.isValid(val) && isParentCategory(val);
            }),
        isActive: z.boolean(),
        icon: z.string().optional(),
        categorySubType: z.string().optional(),
        //but one of the below is required
        isEnabledForStore: z.boolean().optional(),
        isEnabledForIndividual: z.boolean().optional(),
    })
    .refine(
        (val) => !!val.parentId || !!val.icon,
        {
            message: "Icon shouldn't be empty for main category",
            path: ["icon"],
        }
    )
    .refine((val) => {
        if (!val.isEnabledForIndividual && !val.isEnabledForStore) {
            return false;
        }
        return true;
    }, {
        message: "Either isEnabledForStore or isEnabledForIndividual should be true",
        path: ["icoisEnabledForStore, isEnabledForIndividualn"],
    });