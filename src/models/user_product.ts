import { Schema, model, Document } from "mongoose";
import { createdAtIST, getIST } from "../utils/ist_time";

export interface UserProductResponse {
    id: string;
    name: string;
    images: string[];
    description: string;
    price: number;
    category: string;
    keyWords: string;
    owner: string;
    isShowPhone: boolean;
    locationName: string;
    createdAt: number;
    distance: string;
    phone: string;
}

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
  forResponse: (distance: number, phone: string, ownerId: string) => UserProductResponse;
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
        //TODO: implement the logic to delete
        // return deleteFile(filename);
    });

    await Promise.all(deletePromises);
};

productSchema.methods.forResponse = function(distance: number, phone: string, ownerId: string) : UserProductResponse  {
   return {
        id: this._id.toString(),
        name: this.name,
        images: this.images,
        description: this.description,
        price: this.price,
        category: this.category.toString(),
        keyWords: this.keyWords,
        owner: ownerId,
        isShowPhone: this.isShowPhone,
        locationName: this.locationName,
        createdAt: this.createdAt.getTime(),
        distance: distance.toFixed(2),
       phone: phone,
   }
}


const UserProduct = model<IUserProduct>("userproducts", productSchema);

export default UserProduct;