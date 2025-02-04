import { Schema, model } from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../config/vars";

export interface IUser {
  _id: string;
  fcmToken: string;
  username: string;
  fullName: string;
  email: string;
  password: string;
  generateAuthToken: (userId: string) => string;
  phone: string;
  otp: string;
  isVerified: boolean;
  isBlocked:boolean;
}

const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
    },
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
    },
    otp: {
      type: String,
    },
    isVerified: {
      type: Boolean,
      default: false,
      required: true,
    },
    isBlocked:{
      type:Boolean,
      default:false
    },
    fcmToken: {
      type: String
    }
  },
  {
    timestamps: true,
  }
);

// userSchema.pre("save", async function (next) {
//   if (!this.isModified("password")) {
//     next();
//   }
//   const salt = await bcrypt.genSalt(12);
//   this.password = await bcrypt.hash(this.password, salt);
// });

// generate auth token
userSchema.methods.generateAuthToken = function (userId: string): string {
  const jwte = config.jwtSecret
  return jwt.sign({ _id: userId }, jwte, { expiresIn: "200d" });
};

const User = model<IUser>("users", userSchema);

export default User;
