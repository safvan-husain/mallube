import { Schema, model, Document, models } from "mongoose";

export interface ITimeSlot extends Document {
  storeId: Schema.Types.ObjectId;
  slots: {
    filter(arg0: (item: any) => boolean): unknown;
    date: Date;
    startTime: string;
    endTime: string;
    token: number;
    slotCount:number;
  }[];
}

const timeSlotSchema = new Schema<ITimeSlot>(
  {
    storeId: {
      type: Schema.Types.ObjectId,
      ref: "stores",
      requried: true,
    },
    slots: [
      {
        date: {
          type: Date,
          required: true,
        },
        startTime: {
          type: String,
          required: true,
        },
        endTime: {
          type: String,
          required: true,
        },
        token:{
          type:Number,
          required:false
        },
        slotCount:{
          type:Number,
          default:1
        }
        
      },
    ],
  },
  {
    timestamps: true,
  }
);

const TimeSlot = models.TimeSlot ||  model<ITimeSlot>("timeSlots", timeSlotSchema);

export default TimeSlot;
