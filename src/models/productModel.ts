import { Schema, model, Document } from "mongoose";

export interface IProduct extends Document {
  name: string;
  images: string[];
  description?: string;
  price: number;
  offerPrice?: number;
  category: Schema.Types.ObjectId;
  store: Schema.Types.ObjectId;
  isActive: boolean; // controlled by admin
  isAvailable: boolean; // conrolled by admin/staff
  isPending: boolean;
  stock:boolean;
  addToCartActive:boolean;
  isEnquiryAvailable?: boolean;
}

const productSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    images: {
      type: [{ type: String, required: true }],
    },
    description: {
      type: String,
    },
    price: {
      type: Number,
      required: true,
    },
    offerPrice: {
      type: Number,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "categories",
      required: true,
    },
    store: {
      type: Schema.Types.ObjectId,
      ref: "stores",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: false,
      required: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
      required: true,
    },
    isPending: {
      type: Boolean,
      default: false,
      required: true,
    },
    stock:{
      type:Boolean,
      default:true,
      required:true
    },
    addToCartActive:{
      type:Boolean,
      default:false,
      required:true
    },
    isEnquiryAvailable: {
      type: Boolean,
      default: false,
      required: true
    },
  },
  {
    timestamps: true,
  }
);

const Product = model<IProduct>("products", productSchema);

export default Product;
