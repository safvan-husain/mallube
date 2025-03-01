import { Schema, model, Document } from "mongoose";

type SubCategoryType = "product" | "store";
export interface ICategory extends Document {
  name: string;
  parentId: Schema.Types.ObjectId;
  isActive: boolean;
  isPending: boolean;
  isEnabledForStore: boolean;
  isEnabledForIndividual: boolean;
  isShowOnHomePage: boolean;
  icon: string;
  isDeclined:boolean;
  subCategoryType: SubCategoryType; //if not and parent is null, it means this category is a 
}

const categorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: true,
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: "categories",
    },
    isActive: {
      type: Boolean,
      default: false,
      required: true,
    },
    isPending: {
      type: Boolean,
      default: true,
      required: true,
    },
    isShowOnHomePage: {
      type: Boolean,
      default: false,
      required: true,
    },
    icon: {
      type: String,
    },
    isDeclined:{
      type:Boolean,
      default:false
    },
    subCategoryType: {
      type: String,
    },
    isEnabledForStore: {
      type: Boolean,
      default: false,
    },
    isEnabledForIndividual: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Category = model<ICategory>("categories", categorySchema);

export default Category;
