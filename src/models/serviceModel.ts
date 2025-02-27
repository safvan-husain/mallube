import {Schema, model, Document} from "mongoose";
import {z} from "zod";
import {Types} from "mongoose";

export interface IService extends Document {
    name: string;
    categories: Schema.Types.ObjectId[];
    phone: string;
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
}

const serviceSchema = new Schema<IService>({
    name: {type: String, required: true},
    categories: {type: [Schema.Types.ObjectId], ref: "serviceCategories", required: true},
    phone: {type: String, required: true, unique: true},
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
});

serviceSchema.index({location: "2dsphere"});

export const Service = model<IService>("Service", serviceSchema);
