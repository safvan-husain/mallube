import {Schema, model, Document} from "mongoose";
import jwt from "jsonwebtoken";
import { config } from "../config/vars";
import { WorkingDay } from "./storeModel";
export interface IService extends Document {
    _id: Schema.Types.ObjectId;
    name: string;
    username: string;
    categories: Schema.Types.ObjectId[];
    phone: string;
    whatsapp: string;
    email: string;
    hashedPassword: string;
    address: string;
    location: {
        type: string;
        coordinates: [number, number];
    };
    isActive: boolean;
    icon: string;
    instagramUrl: string;
    facebookUrl: string;
    startTime: number;
    endTime: number;
    bio: string;
    city: string;
    district: string;
    generateAuthToken: () => string;
    workingDays: WorkingDay[];
}

const serviceSchema = new Schema<IService>({
    name: {type: String, required: true},
    username: {type: String, required: true, unique: true},
    hashedPassword: {type: String, required: true},
    categories: {type: [Schema.Types.ObjectId], ref: "serviceCategories", required: true},
    phone: {type: String, required: true, unique: true},
    whatsapp: {type: String, default: ""},
    email: {type: String, default: ""},
    address: {type: String, required: true},
    location: {
        type: {type: String, enum: ["Point"], default: "Point"},
        coordinates: {type: [Number], required: true},
    },
    isActive: {type: Boolean, default: true},
    icon: {type: String, required: true},
    instagramUrl: {type: String, default: ''},
    facebookUrl: {type: String, default: ""},
    startTime: {type: Number, required: true},
    endTime: {type: Number, required: true},
    bio: {type: String, default: ""},
    city: {type: String, default: ""},
    district: {type: String, default: ""},
    workingDays: {
      default: [],
      type: [String],
    },
});

serviceSchema.methods.generateAuthToken = function (): string {
    const jwt_secret = config.jwtSecret
    return jwt.sign({ _id: this._id }, jwt_secret, { expiresIn: "400d" });
};

serviceSchema.index({location: "2dsphere"});

export const Service = model<IService>("Service", serviceSchema);
