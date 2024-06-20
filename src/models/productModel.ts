import { Schema, model, Document } from "mongoose";

export interface IProduct extends Document {
  name: string;
  images: string[];
  description?: string;
  price: number;
  offerPrice?: number;
  category: Schema.Types.ObjectId;
  store: Schema.Types.ObjectId;
  isActive: boolean;
  isPending: boolean;
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
    store: {
      type: Schema.Types.ObjectId,
      ref: "stores",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Product = model<IProduct>("products", productSchema);

export default Product;
