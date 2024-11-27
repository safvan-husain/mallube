import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

import Category from "../../models/categoryModel";
import {
  IAddCategorySchema,
  IUpdateCategorySchema,
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

// get all categories for admin category management
export const getCategories = asyncHandler(
  async (req: Request, res: Response) => {
    const categories = await getCategoriesInFormat({
      isActive: Boolean(req.query.isActive),
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
  async (req: ICustomRequest<IAddCategorySchema>, res: Response) => {
    const { name, parentId, isActive, icon } = req.body;
    const isDuplicate = await isDuplicateCategory(name, parentId);

    if (isDuplicate) res.status(409).json("Duplicate Category");
    else {
      await Category.create({ name, parentId, isActive, icon });

      res.status(201).json("ok");
    }
  }
);

// update category
export const updateCategory = asyncHandler(
  async (req: ICustomRequest<IUpdateCategorySchema>, res: Response) => {
    const { id } = req.params;

    const { isPending, parentId, ...rest } = req.body;
    const updatedParentId = new Types.ObjectId(parentId);

    if (!Types.ObjectId.isValid(id)) {
      res.status(404).json({ message: "Invalid category id" });
    } else {
      const category = await Category.findByIdAndUpdate(id, {
        isPending,
        ...rest,
      });

      if (!isPending) {
        if (Types.ObjectId.isValid(updatedParentId)) {
          const parent=await Category.findById(updatedParentId)
          if(parent){
            let icon=parent.icon
            await Category.findByIdAndUpdate(id,{isPending,...rest,parentId:updatedParentId,icon:icon})
          }
          await Product.updateMany({ category: id }, { isPending: false });
        }
      }
      if (category) {
        res.status(200).json("Product has been updated");
      } else {
        res.status(404).json({ message: "Invalid category id" });
      }
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
