import { Schema, model, Document } from "mongoose";
import Store from "./storeModel";
import { Freelancer } from "./freelancerModel";
import {z} from "zod";

export const productUnitSchema = z.enum(['kg', 'g', 'l', 'ml', 'pcs']);
export type ProductUnit = z.infer<typeof productUnitSchema>

export interface IProduct extends Document {
  name: string;
  images: string[];
  description?: string;
  price: number;
  offerPrice?: number;
  category: Schema.Types.ObjectId;
  store?: Schema.Types.ObjectId;
  isActive: boolean; // controlled by admin
  isAvailable: boolean; // conrolled by admin/staff
  isPending: boolean;
  stock: boolean;
  addToCartActive: boolean;
  isEnquiryAvailable?: boolean;
  location: {
    type: string;
    coordinates: [number, number];
  };
  quantity: number,
    unit: ProductUnit
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
      required: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    isPending: {
      type: Boolean,
      default: false,
    },
    stock: {
      type: Boolean,
      default: true,
    },
    addToCartActive: {
      type: Boolean,
      default: false,
    },
    isEnquiryAvailable: {
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
      quantity: {type: Number, default: 1},
      unit: {type: String, enum: ['kg', 'g', 'l', 'ml', 'pcs'], default: 'pcs'}
  },

  {
    timestamps: true,
  }
);

//TODO: separate from pre save, what we have call with updateOne, this will not fet affected
// Middleware to set the product's location from its store
productSchema.pre('save', async function (next) {
  // Check if the store field is modified or this is a new product
  if (this.store) {
    if (this.isModified('store') || this.isNew) {
      // Fetch the associated store
      const store = await Store.findById(this.store);
      if (!store) {
        throw new Error('Store not found');
      }
      // Set the product's location to the store's location
      this.location = store.location;
    }
  }
  next();
});

productSchema.index({ location: "2dsphere" });

const Product = model<IProduct>("products", productSchema);

export default Product;
