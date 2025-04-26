import { Schema, model } from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export interface IStaff {
  _id: string;
  name: string;
  email: string;
  password: string;
  generateAuthToken: (userId: string) => string;
  status: string;
  addedStores: Array<string>;
  addedProducts:Array<string>;
  target:number;
  addedStoresCount:number;
  phone:string;
}

const staffSchema = new Schema<IStaff>(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    status:{
        type: String,
        required:true,
        default: "active", 
    },
    addedStores:{
        type:[String],
    },
    addedProducts:{
        type: [String],
    },
    target:{
      type:Number
    },
    addedStoresCount:{
      type:Number,
      default:0
    },
    phone:{
      type:String
    }
  },
  {
    timestamps: true,
  }
);

staffSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// generate authentication token
staffSchema.methods.generateAuthToken = function (userId: string): string {
  return jwt.sign({ _id: userId }, "staffSecrete", { expiresIn: "360d" });
};

const Staff = model<IStaff>("staffs", staffSchema);

export default Staff;
