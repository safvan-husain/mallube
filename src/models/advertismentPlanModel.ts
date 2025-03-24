
import { Schema, model, Document } from "mongoose";

export interface IAdvertisementPlan extends Document {
    name: string;
    price: number;
    offerPrice?: number;
    duration: number;
    //When radius are undefined, which mean no limit (all users should see the advertisement)
    maxRadius?: number;
    maxRadiusInRadians?: number;
    message?: string;
}

const advertisementPlanSchema = new Schema<IAdvertisementPlan>({
    name: {
        type: String,
        required: true,
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