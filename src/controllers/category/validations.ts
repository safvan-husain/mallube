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
        isPending: z.boolean().default(false).optional(),
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

export const updateCategorySchemaV2 = z
    .object({
        name: z.string().min(1, "category name cannot be empty").optional(),
        parentId: z
            .string()
            .optional()
            .refine((val) => {
                if (val === undefined) return true;
                return Types.ObjectId.isValid(val) && isParentCategory(val);
            }),
        isActive: z.boolean().optional(),
        icon: z.string().optional(),
        categorySubType: z.string().optional(),
        //but one of the below is required
        isEnabledForStore: z.boolean().optional(),
        isEnabledForIndividual: z.boolean().optional(),
    })
    .refine((val) => {
        if (val.isEnabledForIndividual == false && val.isEnabledForStore == false) {
            return false;
        }
        return true;
    }, {
        message: "Either isEnabledForStore or isEnabledForIndividual should be true",
        path: ["icoisEnabledForStore, isEnabledForIndividualn"],
    });

const getCategoriesSchema = z.object({
    isActive: z.boolean().default(true),
    isStoreOnly: z.boolean().default(false),
    isFreelanceOnly: z.boolean().default(false),
});