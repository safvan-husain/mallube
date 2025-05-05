import {Schema, model, Types} from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {config} from "../config/vars";

export interface IUser {
    _id: string;
    fcmToken: string;
    username: string;
    fullName: string;
    email: string;
    password: string;
    generateAuthToken: () => string;
    phone: string;
    otp: string;
    isVerified: boolean;
    isBlocked: boolean;
    isPushNotificationEnabled: boolean;
    favouriteFreelancers: Types.ObjectId[];
    favouriteShops: Types.ObjectId[];
    authToken?: string;
    favouriteUserProducts: Types.ObjectId[];
}

const userSchema = new Schema<IUser>(
    {
        username: {type: String,},
        fullName: {type: String, required: true,},
        email: {type: String, unique: true,},
        password: {type: String, required: true,},
        phone: {type: String, required: true, unique: true,},
        otp: {type: String,},
        isVerified: {type: Boolean, default: false, required: true,},
        isBlocked: {type: Boolean, default: false},
        fcmToken: {type: String},
        authToken: {type: String},
        isPushNotificationEnabled: {type: Boolean, default: true,},
        favouriteFreelancers: [
            {type: Schema.Types.ObjectId, ref: "stores",},
        ],
        favouriteShops: [
            {type: Schema.Types.ObjectId, ref: "stores",},
        ],
        favouriteUserProducts: [
            {type: Schema.Types.ObjectId, ref: "userproducts"}
        ]
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

// generate authentication token
userSchema.methods.generateAuthToken = function (): string {
    return jwt.sign({_id: this._id, type: 'user' }, config.jwtSecret);
};

const User = model<IUser>("users", userSchema);

export default User;
