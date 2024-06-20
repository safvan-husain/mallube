import { Schema, model, Document } from "mongoose";

export interface IAdvertisement extends Document {
  image: string;
  advertisementDisplayStatus:"showIinMainCarousal" | "showInSecondCarousal" | "hideFromBothCarousal";
  store? : Schema.Types.ObjectId;
}

const advertisementSchema = new Schema<IAdvertisement>({
  image: {
    type: String,
    required: true,
  },
  advertisementDisplayStatus: {
    type: String,
    enum:["showIinMainCarousal" , "showInSecondCarousal" , "hideFromBothCarousal"],
    default: "hideFromBothCarousal",
  },
  store: {
    type: Schema.Types.ObjectId,
    ref: "stores",
    required: false,
  },
});

const Advertisement = model<IAdvertisement>(
  "advertisements",
  advertisementSchema
);

export default Advertisement;
