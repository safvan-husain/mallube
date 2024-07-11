import { Schema, model } from "mongoose";

const subscriptionPlanSchema = new Schema({
    name: { type: String, required: true, unique: true },
    maxProductImages: { type: Number, required: true },
  });

const SubscriptionPlan = model('subscriptionplans', subscriptionPlanSchema);

export default SubscriptionPlan;