import mongoose, {Schema, Document, Types} from 'mongoose';
import {z} from "zod";

export const pendingBusinessStatus = z.enum(['pending', 'interested', 'registered', 'contacted', 'not interested', 'not attended'])

export type PendingBusinessStatus = z.infer<typeof pendingBusinessStatus>;

export interface IPendingBusiness extends Document {
    _id: Types.ObjectId;
    businessType: 'freelancer' | 'business';
    name: string;
    category: Types.ObjectId;
    note: string;
    phone: string;
    place: string;
    city: string;
    district: string;
    nearBy?: string;
    status: PendingBusinessStatus,
    createdBy: Types.ObjectId;
    lastContacted?: Date;
}

const PendingStoreSchema: Schema<IPendingBusiness> = new Schema({
    businessType: {
        type: String,
        enum: ['freelancer', 'business'],
        required: true,
    },
    name: {type: String, required: true},
    category: {type: Schema.Types.ObjectId, ref: 'categories', required: true},
    note: {type: String, required: true},
    phone: {type: String, required: true},
    place: {type: String, required: true},
    city: {type: String, required: true},
    district: {type: String, required: true},
    nearBy: {type: String},
    status: {
        type: String,
        default: 'pending',
    },
    createdBy: {type: Schema.Types.ObjectId, ref: 'Employee', required: true},
    lastContacted: {type: Date}
}, {
    timestamps: true
});

PendingStoreSchema.index({ businessType: 1, status: 1 });

export const PendingBusiness = mongoose.model<IPendingBusiness>('PendingBusiness', PendingStoreSchema);


