import { Schema, model, Document } from "mongoose";
import Store from "./storeModel";

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
  stock: boolean;
  addToCartActive: boolean;
  isEnquiryAvailable?: boolean;
  location: {
    type: string;
    coordinates: [number, number];
  };
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
  },
  {
    timestamps: true,
  }
);

// Middleware to set the product's location from its store
productSchema.pre('save', async function (next) {
  // Check if the store field is modified or this is a new product
  if (this.isModified('store') || this.isNew) {
    // Fetch the associated store
    const store = await Store.findById(this.store);
    if (!store) {
      throw new Error('Store not found');
    }

    // Set the product's location to the store's location
    this.location = store.location;
  }
  next();
});

const Product = model<IProduct>("products", productSchema);

export default Product;
