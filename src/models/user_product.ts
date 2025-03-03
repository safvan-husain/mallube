import { Schema, model, Document } from "mongoose";

//generate zod schema
export interface IUserProduct extends Document {
  name: string;
  images: string[];
  description?: string;
  price: number;
  category: Schema.Types.ObjectId;
  owner: Schema.Types.ObjectId;
  keyWords: string[];
  isShowPhone: boolean;
  location: {
    type: string;
    coordinates: [number, number];
  };
  createdAt: Date;
}

const productSchema = new Schema<IUserProduct>(
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
    category: {
      type: Schema.Types.ObjectId,
      ref: "categories",
      required: true,
    },
    keyWords: {
        type: [String],
        default: [],
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    isShowPhone: {
      type: Boolean,
      default: false,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    createdAt: {
        type: Date,
        default: Date.now,
    }
  },
);

productSchema.index({ location: "2dsphere" });

const UserProduct = model<IUserProduct>("userproducts", productSchema);

export default UserProduct;