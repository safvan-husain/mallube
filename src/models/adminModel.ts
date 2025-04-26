import { Schema, model } from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export interface IAdmin {
  _id: string;
  name?: string;
  email: string;
  password: string;
  generateAuthToken: (userId: string) => string;
  addedStaff:Array<string>;
  //TODO: remove
  token?: string;
}

const adminSchema = new Schema<IAdmin>(
  {
    name: {
      type: String,
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
    addedStaff:{
      type:[String]
    },
      token: {
        type: String
      }

  },
  {
    timestamps: true,
  }
);

adminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// generate authentication token
adminSchema.methods.generateAuthToken = function (userId: string): string {
  return jwt.sign({ _id: userId }, "adminSecrete", { expiresIn: "360d" });
};

const Admin = model<IAdmin>("admins", adminSchema);

export default Admin;
