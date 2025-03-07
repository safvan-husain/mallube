import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

import Category from "../../models/categoryModel";
import {
  IAddCategorySchema,
  IUpdateCategorySchema,
  updateCategorySchema,
} from "../../schemas/category.schemas";
import { ICustomRequest } from "../../types/requestion";
import {
  isDuplicateCategory,
  getCategoriesInFormat,
  listActiveMainCategories,
  listActiveSubCategories,
  listPendingSubCategories,
} from "../../service/category";
import { Types } from "mongoose";
import Product from "../../models/productModel";
import Store from "../../models/storeModel";
import { addCategorySchema, updateCategorySchemaV2 } from "./validations";
import { onCatchError } from "../service/serviceContoller";
import { Freelancer } from "../../models/freelancerModel";

// get all categories for admin category management
export const getCategories = asyncHandler(
  async (req: Request, res: Response) => {
    const { isStoreOnly } = req.query;
    const categories = await getCategoriesInFormat({
      isActive: Boolean(req.query.isActive),
      isStoreOnly: Boolean(isStoreOnly),
      isFreelancerOnly: Boolean(req.query.isFreelancerOnly),
    });
    res.status(200).json(categories);
  }
);

export const getPendingSubCategories = asyncHandler(
  async (req: Request, res: Response) => {
    const categories = await listPendingSubCategories();

    res.status(200).json(categories);
  }
);

//get active main categories only for showing while adding shop
export const getActiveMainCategories = asyncHandler(
  async (req: Request, res: Response) => {
    const activeMainCategories = await listActiveMainCategories();

    res.status(200).json(activeMainCategories);
  }
);

// get subcategories of a main category by id
export const getActiveSubCategories = asyncHandler(
  async (req: Request, res: Response) => {
    const activeSubCategories = await listActiveSubCategories(req.params.id);
    res.status(200).json(activeSubCategories);
  }
);

// adding category for admin and staff
export const addCategory = asyncHandler(
  async (req: ICustomRequest<any>, res: Response) => {
    try {
      const { name, parentId, isActive, icon, categorySubType: subCategoryType,
        isEnabledForIndividual, isEnabledForStore, } = await addCategorySchema.parseAsync(req.body);
      let isPending = true;
      const { isAdmin } = req.query;
      if (isAdmin) {
        isPending = false; //if category added by admin, the accept right away.
      }
      const isDuplicate = await isDuplicateCategory(name, parentId);

      if (isDuplicate) res.status(409).json("Duplicate Category");
      else {
        await Category.create({
          name, parentId, isActive, icon, isPending,
          subCategoryType, isEnabledForIndividual, isEnabledForStore
        });
        res.status(201).json({ message: "ok" });
      }
    } catch (error) {
      onCatchError(error, res);
    }
  }
);


export const getStoreSubCategories = asyncHandler(
  async (req: ICustomRequest<undefined>, res: any) => {
    const storeId = req.store!._id;
    try {
      const storeData = await Store.findById(storeId, 'category').lean();
      const categories = await Category.find({ parentId: storeData?.category, subCategoryType: 'store' });
      res.status(200).json(categories);
    } catch (error) {
      res.status(500).json({ message: `Internal server error ${error}` });
    }
  }
)

export const getProductCategories = asyncHandler(
  async (req: ICustomRequest<undefined>, res: any) => {
    const id = req.store?._id ?? req.individual?._id;
    const { bussinessType } = req.query;
    if (!Types.ObjectId.isValid(id ?? "")) {
      res.status(404).json({ message: "Invalid Object Id" });
      return;
    }
    try {
      let parentCategories: any[] = [];
      if (bussinessType === 'freelance') {
        const storeData = await Store.findById(id, 'category').lean();
        parentCategories.push(storeData?.category);
      } else {
        const individualData = await Freelancer.findById(id, { categories: 1 }).lean();
        parentCategories = individualData?.categories ?? [];
      }
      const categories = await Category.find({ parentId: { $in: parentCategories }, subCategoryType: 'product' }, { icon: true, isActive: true, name: true });
      const categories2 = await Category.find({ parentId: { $in: parentCategories } }, { icon: true, isActive: true, name: true });
      res.status(200).json({ categories, categories2, parentCategories });
    } catch (error) {
      res.status(500).json({ message: `Internal server error ${error}` });
    }
  }
)

// update category
export const updateCategory = asyncHandler(
  async (req: ICustomRequest<any>, res: Response) => {
    const { id } = req.params;
    try {
      const { categorySubType: subCategoryType, ...rest } = await updateCategorySchemaV2.parseAsync(req.body);

      if (!Types.ObjectId.isValid(id)) {
        res.status(404).json({ message: "Invalid category id" });
      } else {
        const category = await Category.findByIdAndUpdate(id, {
          subCategoryType,
          ...rest,
        });

        if (category) {
          res.status(200).json("Product has been updated");
        } else {
          res.status(404).json({ message: "Invalid category id" });
        }
      }
    } catch (error) {
      onCatchError(error, res);
    }
  }
);

export const deleteCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const declinedCategory = await Category.findById(id);
    if (declinedCategory) {
      declinedCategory.isDeclined = true;
      declinedCategory.save();
      res.status(200).json("Category has been declined");
    } else {
      res.status(404).json({ message: "Invalid category id" });
    }
  }
);

export const deleteCategoryPermenently = asyncHandler(
  async (req: Request, res: Response) => {
    const { categoryId } = req.query;
    try {
      await Category.findByIdAndDelete(categoryId);
      await Category.deleteMany({ parentId: categoryId });
      res.status(200).json({ message: "Successfully deleted" });
    } catch (error) {
      res.status(500)
    }
  }
)

// // delete product

// export const deleteProduct = asyncHandler(
//   async (req: Request, res: Response) => {
//     const product = await Product.findById(req.params.id);

//     if (product) {
//       // await product.remove();
//       res.status(200).json("Product has been deleted");
//     } else {
//       res.status(400);
//       throw new Error("Product not found!");
//     }
//   }
// );

// get single category
// export const getCategoryById = asyncHandler(
//   async (req: Request, res: Response) => {
//     const product = await Product.findById(req.params.id);

//     if (product) {
//       res.status(200).json(product);
//     } else {
//       res.status(400);
//       throw new Error("product not found!");
//     }
//   }
// );
