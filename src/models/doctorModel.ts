import { Schema, model, Document } from "mongoose";

export interface IDoctor extends Document {
  name: string;
  specialisation: Schema.Types.ObjectId;
  availableTime: string;
  noOfToken: number;
  token:number; //for counting token
  offDays: Array<"monday" | "tuesday" | "wednsday" | "thursday" | "friday" | "saturday" | "sunday">;
  isAvailable: boolean;
  storeId: Schema.Types.ObjectId;
  imageUrl:string;
}

const doctorSchema = new Schema<IDoctor>(
  {
    name: {
      type: String,
      required: true,
    },
    specialisation: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    availableTime: {
      type: String,
      required: true,
    },
    token:{
      type:Number,
      default:0
    },
    offDays:{
        type:[String],
        enum:["monday", "tuesday", "wednsday", "thursday", "friday", "saturday", "sunday"],
    },
    noOfToken: {
      type: Number,
      required: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    storeId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    imageUrl:{
        type:String,
        required:true
    }
  },
  {
    timestamps: true,
  }
);
const Doctor = model<IDoctor>("doctors", doctorSchema);

export default Doctor;
