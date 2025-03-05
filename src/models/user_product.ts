import { Schema, model, Document } from "mongoose";
import { createdAtIST, getIST } from "../utils/ist_time";
import { deleteFile } from "../controllers/upload/fileUploadController";

//generate zod schema
export interface IUserProduct extends Document {
  name: string;
  images: string[];
  description?: string;
  price: number;
  category: Schema.Types.ObjectId;
  owner: Schema.Types.ObjectId;
  keyWords: string;
  isShowPhone: boolean;
  locationName: string;
  location: {
    type: string;
    coordinates: [number, number];
  };
  createdAt: Date;
  expireAt: Date;
  isExpired: () => boolean;
  deleteImagesFromBucket: () => Promise<boolean[]>;
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
        type: String,
        default: "",
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
    locationName: {
      type: String,
      required: true,
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
        required: true,
    },
    expireAt: {
        type: Date,
        required: true,
        index: true,
    }
  },
);

productSchema.index({ location: "2dsphere" });

productSchema.methods.isExpired = function () {
    return createdAtIST() > this.expireAt;
};

productSchema.methods.deleteImagesFromBucket = async function () {
    if (!this.images || !Array.isArray(this.images)) return;

    const deletePromises = this.images.map(image => {
        const filename = image.split("/").pop();
        return deleteFile(filename);
    });

    await Promise.all(deletePromises);
};


const UserProduct = model<IUserProduct>("userproducts", productSchema);

export default UserProduct;