import {Schema, model, Document, Types} from "mongoose";
import {z} from "zod";

const advertisementStatusSchema = z.enum(['pending', 'live', 'expired', 'rejected'])
export type AdvertisementStatus = z.infer<typeof advertisementStatusSchema>

//using generic args, so that when populating, we can still have type safety.
export interface IAdvertisement<T = Types.ObjectId, S = Types.ObjectId> extends Document {
    image: string;
    isActive: boolean;
    status: AdvertisementStatus;
    isPostedByAdmin: boolean;
    store?: T;
    expireAt?: Date;
    location?: {
        type: string;
        coordinates: [number, number];
    };
    radius?: number;
    radiusInRadians?: number;
    adPlan?: S;
    createdAt: Date;
}

const advertisementSchema = new Schema<IAdvertisement>({
        image: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            default: "pending",
        },
        isActive: {
            type: Boolean,
            default: false,
            index: true
        },
        isPostedByAdmin: {
            type: Boolean,
            default: false,
            required: true,
        },
        store: {
            type: Schema.Types.ObjectId,
            ref: "stores",
            required: false,
        },
        expireAt: {
            type: Date,
        },
        location: {
            type: {
                type: String,
                enum: ["Point"],
                default: "Point",
            },
            coordinates: {
                type: [Number],
                required: true,
            },
        },
        radius: {
            type: Number,
        },
        radiusInRadians: {
            type: Number,
        },
        adPlan: {
            type: Schema.Types.ObjectId,
            ref: "advertisementPlans",
        }
    },
    {
        timestamps: true,
    });

advertisementSchema.index({
    expireAt: 1,
    isActive: 1
}, {
    sparse: true,
    background: true
});

const Advertisement = model<IAdvertisement>(
    "advertisements",
    advertisementSchema
);

export default Advertisement;
