
import { Schema, model, Document } from "mongoose";

interface IAdvertisementPlan extends Document {
    name: string;
    price: number;
    duration: number;
    maxRadius: number;
    maxRadiusInRadians: number;
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
    duration: {
        type: Number,
        required: true,
    },
    maxRadius: {
        type: Number,
        required: true,
    },
    maxRadiusInRadians: {
        type: Number,
        required: true,
    },
})

const AdvertisementPlan = model<IAdvertisementPlan>(
    "advertisementPlans",
    advertisementPlanSchema
);

export default AdvertisementPlan;