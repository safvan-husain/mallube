import {Schema, model, Document, InferSchemaType, Types} from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

interface IManager extends Document {
    _id?: Types.ObjectId;
    name: string;
    username: string;
    hashedPassword?: string;
    generateAuthToken: () => string;
    isActive: boolean;
    address: string;
    place: string;
    city: string;
    district: string;
    phone: string;
    aadharNumber: string;
    companyPhone: string;
    workAreaName: string;
    joinedDate: Date;
    resignedDate?: Date;
}

export type TManager = {
    name: string;
    username: string;
    hashedPassword?: string;
    isActive: boolean;
    address: string;
    place: string;
    city: string;
    district: string;
    phone: string;
    aadharNumber: string;
    companyPhone: string;
    workAreaName: string;
    joinedDate: Date;
    resignedDate?: Date;
}

const managerSchema = new Schema<IManager>(
    {
        name: {type: String, required: true,},
        username: {
            type: String,
            required: true,
            unique: true,
        },
        hashedPassword: {
            type: String,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        address: {
            type: String,
            required: true,
        },
        place: {
            type: String,
            required: true,
        },
        city: {
            type: String,
            required: true,
        },
        district: {
            type: String,
            required: true,
        },
        phone: {
            type: String,
            required: true,
        },
        aadharNumber: {
            type: String,
            required: true,
        },
        companyPhone: {
            type: String,
            required: true,
        },
        workAreaName: {
            type: String,
            required: true,
        },
        joinedDate: {
            type: Date,
            required: true,
        },
        resignedDate: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

managerSchema.pre("save", async function (next) {
    if (!this.isModified("hashedPassword") ||  !this.hashedPassword) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.hashedPassword = await bcrypt.hash(this.hashedPassword, salt);
    next();
});

// Generate auth token
managerSchema.methods.generateAuthToken = function (): string {
    return jwt.sign({_id: this._id}, "managerSecret", {expiresIn: "360d"});
};


const Manager = model<IManager>("Manager", managerSchema);

export default Manager;
