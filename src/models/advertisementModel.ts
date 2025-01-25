import { Schema, model, Document } from "mongoose";

export interface IAdvertisement extends Document {
  image: string;
  advertisementDisplayStatus: "showIinMainCarousal" | "showInSecondCarousal" | "hideFromBothCarousal";
  isActive: boolean;
  store?: Schema.Types.ObjectId;
  timestamp: Date;
  expireAt?: Date;
  location: {
    type: string;
    coordinates: [number, number];
  };
  radius: number;
  radiusInRadians: number;
  adPlan?: Schema.Types.ObjectId;
}

const advertisementSchema = new Schema<IAdvertisement>({
  image: {
    type: String,
    required: true,
  },
  advertisementDisplayStatus: {
    type: String,
    enum: ["showIinMainCarousal", "showInSecondCarousal", "hideFromBothCarousal"],
    default: "hideFromBothCarousal",
  },
  isActive: {
    type: Boolean,
    default: false,
  },
  store: {
    type: Schema.Types.ObjectId,
    ref: "stores",
    required: false,
  },
  timestamp: {
    type: Date,
    default: Date.now,
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
    required: true,
  },
  radiusInRadians: {
    type: Number,
    required: true,
  },
  adPlan: {
    type: Schema.Types.ObjectId,
    ref: "advertisementPlans",
    required: true,
  }
});

const Advertisement = model<IAdvertisement>(
  "advertisements",
  advertisementSchema
);

export default Advertisement;
