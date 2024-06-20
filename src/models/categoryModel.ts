import { Schema, model, Document } from "mongoose";

export interface ICategory extends Document {
  name: string;
  parentId: Schema.Types.ObjectId;
  isActive: boolean;
  isPending: boolean;
  isShowOnHomePage: boolean;
  icon:string;
}

const categorySchema = new Schema(
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
      default: false,
      required: true,
    },
    isShowOnHomePage: {
      type: Boolean,
      default: false,
      required: true,
    },
    icon:{
      type:String,
      unique:true
    }
  },
  {
    timestamps: true,
  }
);

const Category = model<ICategory>("categories", categorySchema);

export default Category;
