import Category from "../../models/categoryModel";
import {Types} from "mongoose";

export const getProductCategoriesOfParent = async (categoryId: string): Promise<{ _id: Types.ObjectId }[]> => {
    return Category.find({ parentId: categoryId, subCategoryType: 'product' }, {}).lean<{ _id: Types.ObjectId }[]>()
}