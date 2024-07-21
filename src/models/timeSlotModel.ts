import { Schema, model, Document } from "mongoose";

export interface ITimeSlot extends Document {
  storeId: Schema.Types.ObjectId;
  slots: {
    date: Date;
    startTime: string;
    endTime: string;
    token: number;
  };
}

const timeSlotSchema = new Schema<ITimeSlot>(
  {
    storeId: {
      type: Schema.Types.ObjectId,
      ref: "stores",
      requried: true,
      unique: true,
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
      },
    ],
  },
  {
    timestamps: true,
  }
);

const TimeSlot = model<ITimeSlot>("timeSlots", timeSlotSchema);

export default TimeSlot;
