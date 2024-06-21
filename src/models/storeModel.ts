import mongoose, { Schema, model, Document } from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export interface IStore extends Document {
  storeName: string;
  uniqueName: string;
  storeOwnerName: string;
  address: string;
  phone: string;
  email: string;
  subscriptionPlan: "basic" | "premium" | "noPlanTaken";
  subscriptionActivatedAt?: Date;
  subscriptionExpiresAt?: Date;
  password: string;
  addedProducts: string[];
  category: Schema.Types.ObjectId;
  addedBy:Schema.Types.ObjectId;
  shopImgUrl: string;
  retail?: boolean;
  wholeSale?: boolean;
  status:'active' | 'inactive';
  live:'temporarilyClosed' | 'permenantlyClosed' | 'open';
  district:string;
  bio:string;
  generateAuthToken: (userId: string) => string;
  // location: {
  //   latitude: Number,
  //   longitude: Number,
  // },
  location:{
    type:string,
    coordinates:[number,number]
  }
  createdAt?: Date;
  updatedAt?: Date;
}

const storeSchema = new Schema<IStore>({
  storeName: {
    type: String,
    required: true,
  },
  uniqueName: {
    type: String,
    required: true,
  },
  storeOwnerName: {
    type: String,
    required: true,
  },
  address: {
    type: String,
  },
  phone: {
    type: String,
    required: true,
    unique:true
  },
  bio:{
    type:String,
  },
  email: {
    type: String,
  },
  shopImgUrl: {
    type: String,
  },
  subscriptionPlan: {
    type:String,
    enum: ["basic" , "premium" , "noPlanTaken"],
    default:"noPlanTaken"
  },
  subscriptionActivatedAt: { 
    type: Date,
  },
  retail: { type: Boolean },
  wholeSale: { type: Boolean },
  subscriptionExpiresAt: {
    type: Date,
  },
  status:{
    type:String,
    enum:['active','inactive'],
    default:"active",
  },
  live:{
    type:String,
    enum:['temporarilyClosed' , 'permenantlyClosed' , 'open'],
    default:'open'
  },
  password: {
    type: String,
  },
  category: {
    type: Schema.Types.ObjectId,
    ref: "categories",
  },
  addedBy:{

  },
  location:{
type:{
  type:String,
  enum:['Point'],
  required:true,
  default:'Point'
},
coordinates:{
  type:[Number],
  required:true,
}
  },
  district:{
    type:String,
  },
  addedProducts: [
    {
      type: mongoose.Types.ObjectId,
      ref: "products",
    },
  ],
  
} ,
{
  timestamps:true
});

// storeSchema.pre("save", async function (next) {
//   if (!this.isModified("password")) {
//     next();
//   }
//   const salt = await bcrypt.genSalt(10);
//   this.password = await bcrypt.hash(this.phone, salt);
// });

// GENERATE AUTH TOKEN
storeSchema.methods.generateAuthToken = function (storeId: string): string {
  return jwt.sign({ _id: storeId }, "storeSecrete", { expiresIn: "7d" });
};


storeSchema.index({location:"2dsphere"});

const Store = model<IStore>("stores", storeSchema);

export default Store;
