import {Schema, model, Document, InferSchemaType, Types} from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {z} from "zod";

export const employeePrivilegeSchema = z.enum(['manager', 'staff']);

export type TEmployeePrivilege = z.infer<typeof employeePrivilegeSchema>;

export interface IEmployee extends Document {
    _id: Types.ObjectId;
    name: string;
    username: string;
    hashedPassword: string;
    generateAuthToken: () => string;
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
    privilege: TEmployeePrivilege;
    manager?: Types.ObjectId;
    dayTarget: number;
    monthTarget: number;
}

export type TEmployee = {
    name: string;
    username: string;
    hashedPassword: string;
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
    privilege: TEmployeePrivilege;
    manager?: Types.ObjectId;
    dayTarget: number;
    monthTarget: number;
}

const employeeSchema = new Schema<IEmployee>(
    {
        name: {type: String, required: true,},
        username: {
            type: String,
            required: true,
            unique: true,
        },
        privilege: {type: String, enum: ['manager', 'staff'], required: true,},
        manager: {type: Schema.Types.ObjectId, ref: 'Employee',},
        hashedPassword: {type: String, required: true},
        address: {type: String, required: true,},
        place: {type: String, required: true,},
        city: {type: String, required: true,},
        district: {type: String, required: true,},
        phone: {type: String, required: true,},
        aadharNumber: {type: String, required: true,},
        companyPhone: {type: String, required: true,},
        workAreaName: {type: String, required: true,},
        joinedDate: {type: Date, required: true,},
        resignedDate: {type: Date,},
        dayTarget: {type: Number, default: 0},
        monthTarget: {type: Number, default: 0},
    },
    {
        timestamps: true,
    }
);

employeeSchema.pre("save", async function (next) {
    if (!this.isModified("hashedPassword") || !this.hashedPassword) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.hashedPassword = await bcrypt.hash(this.hashedPassword, salt);
    next();
});

// Generate auth token
employeeSchema.methods.generateAuthToken = function (): string {
    return jwt.sign({_id: this._id}, "managerSecret", {expiresIn: "360d"});
};


const Employee = model<IEmployee>("Employee", employeeSchema);

export default Employee;
