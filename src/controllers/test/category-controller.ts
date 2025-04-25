
import expressAsyncHandler from "express-async-handler";
import {Request, Response} from "express";
import Category from "../../models/categoryModel";

import {onCatchError} from "../../error/onCatchError";

export const randomizeCategoryFields = expressAsyncHandler(
    async (req: Request, res: Response) => {
        try {
            // Get all main categories (no parentId)
            const mainCategories = await Category.find({ parentId: { $exists: false } });
            
            for (const mainCat of mainCategories) {
                // Randomly set enabled fields for main category
                mainCat.isEnabledForStore = Math.random() < 0.5;
                mainCat.isEnabledForIndividual = Math.random() < 0.5;
                await mainCat.save();

                // Get and update subcategories
                const subCategories = await Category.find({ parentId: mainCat._id });
                for (const subCat of subCategories) {
                    // Child can only be enabled if parent is enabled
                    subCat.isEnabledForStore = mainCat.isEnabledForStore && Math.random() < 0.5;
                    subCat.isEnabledForIndividual = mainCat.isEnabledForIndividual && Math.random() < 0.5;
                    await subCat.save();
                }
            }

            res.status(200).json({ message: "Categories updated successfully" });
        } catch (error) {
            onCatchError(error, res);
        }
    }
);
