import { Schema, model, Document ,Types} from "mongoose";
import jwt from "jsonwebtoken";
import { config } from "../config/vars";

export interface IStore extends Document {
  storeName: string;
  uniqueName: string;
  storeOwnerName: string;
  address: string;
  city: string;
  phone: string;
  whatsapp: string;
  email: string;
  subscription: {
    plan: Schema.Types.ObjectId;
    activatedAt?: Date;
    expiresAt?: Date;
  };
  password: string;
  category: Schema.Types.ObjectId;
  addedBy: Schema.Types.ObjectId;
  visitors: Types.ObjectId[];
  shopImgUrl: string;
  retail?: boolean;
  wholesale?: boolean;
  isActive: boolean; //this field will be used by admin to block and unblock a shop
  isAvailable: boolean; // this field will be used by store owner to change their shop status
  district: string;
  bio: string;
  generateAuthToken: (userId: string) => string;
  location: {
    type: string;
    coordinates: [number, number];
  };
  createdAt?: Date;
  updatedAt?: Date;
  storeProviding?:"productBased" |  "serviceBased"
}

const storeSchema = new Schema<IStore>(
  {
    storeName: {
      type: String,
      required: true,
    },
    uniqueName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "categories",
    },
    retail: { type: Boolean },
    wholesale: { type: Boolean },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        // required: true,
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    city: {
      type: String,
    },
    district: {
      type: String,
    },
    address: {
      type: String,
    },
    storeOwnerName: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    whatsapp: {
      type: String,
      required: true,
    },
    email: {
      type: String,
    },
    bio: {
      type: String,
    },
    shopImgUrl: {
      type: String,
    },
    subscription: {
      plan: {
        type: Schema.Types.ObjectId,
        ref: "subscriptionplans",
      },
      activatedAt: Date,
      expiresAt: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    password: {
      type: String,
    },
    addedBy: {
      type: Schema.Types.ObjectId,
      ref: "staffs",
    },
    storeProviding:{
      type:String,
      default:"productBased"
    },
    visitors: [{ type: Schema.Types.ObjectId, ref: 'users' }],

  },
  {
    timestamps: true,
  }
);

// storeSchema.pre("save", async function (next) {
//   if (!this.isModified("password")) {
//     next();
//   }
//   const salt = await bcrypt.genSalt(10);
//   this.password = await bcrypt.hash(this.phone, salt);
// });

// GENERATE AUTH TOKEN
storeSchema.methods.generateAuthToken = function (storeId: string): string {
  return jwt.sign({ _id: storeId }, config.jwtSecret, { expiresIn: "7d" });
};

storeSchema.index({ location: "2dsphere" });

const Store = model<IStore>("stores", storeSchema);

export default Store;
