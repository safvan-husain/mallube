import { Schema, model, Document } from "mongoose";

export interface IAdvertisement extends Document {
  image: string;
  isActive: boolean;
  isPostedByAdmin: boolean;
  store?: Schema.Types.ObjectId;
  timestamp: Date;
  expireAt?: Date;
  location?: {
    type: string;
    coordinates: [number, number];
  };
  radius?: number;
  radiusInRadians?: number;
  adPlan?: Schema.Types.ObjectId;
}

const advertisementSchema = new Schema<IAdvertisement>({
  image: {
    type: String,
    required: true,
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
  },
  radiusInRadians: {
    type: Number,
  },
  adPlan: {
    type: Schema.Types.ObjectId,
    ref: "advertisementPlans",
  }
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
