import { Schema, model, Document, models } from "mongoose";

export interface ITimeSlot extends Document {
  storeId: Schema.Types.ObjectId;
  date: Date,
  startTime: Date;
  endTime: Date;
  token: number;
  numberOfAvailableSeats: number;
  numberOfTotalSeats: number;
  slotIndex: number;
}

const timeSlotSchema = new Schema<ITimeSlot>(
  {
    slotIndex: {
      type: Number,
      default: 0,
    },
    storeId: {
      type: Schema.Types.ObjectId,
      ref: "stores",
      requried: true,
    },
    date: {
      type: Date,
      expires: '1d',
      default: Date.now
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    //used to track available seats, after each bookings
    numberOfAvailableSeats: {
      type: Number,
      default: 1
    },
    //the number seats available on this time, (in other words, how many users can book at this time)
    numberOfTotalSeats: {
      type: Number,
      default: 1
    }
  },
  {
    timestamps: true,
  }
);

export const TimeSlot = models.TimeSlot || model<ITimeSlot>("timeSlots", timeSlotSchema);

export default TimeSlot;
