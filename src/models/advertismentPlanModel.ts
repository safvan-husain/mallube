
import {Schema, model, Document, Types} from "mongoose";

export interface IAdvertisementPlan extends Document {
    _id: Types.ObjectId;
    name: string;
    price: number;
    offerPrice?: number;
    duration: number;
    //When radius are undefined, which mean no limit (all users should see the advertisement)
    maxRadius?: number;
    maxRadiusInRadians?: number;
    message?: string;
    isActive: boolean;
}

const advertisementPlanSchema = new Schema<IAdvertisementPlan>({
    name: {
        type: String,
        required: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    price: {
        type: Number,
        required: true,
    },
    offerPrice: {
        type: Number,
    },
    duration: {
        type: Number,
        required: true,
    },
    maxRadius: {
        type: Number,
    },
    maxRadiusInRadians: {
        type: Number,
    },
    message: {
        type: String,
    }
})

const AdvertisementPlan = model<IAdvertisementPlan>(
    "advertisementPlans",
    advertisementPlanSchema
);

export default AdvertisementPlan;