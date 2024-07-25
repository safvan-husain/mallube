import { Schema, model, Document } from "mongoose";

export interface IBooking extends Document {
    timeSlotId: Schema.Types.ObjectId;
    storeId: Schema.Types.ObjectId;
    userId: Schema.Types.ObjectId;
    token:number;
    startTime:string,
    endTime:string,
    date:Date;
}
const bookingSchema = new Schema<IBooking>(
    {
        timeSlotId:{
            type:Schema.Types.ObjectId,
            required:true,
        },
        storeId:{
            type:Schema.Types.ObjectId,
            required:true
        },
        userId:{
            type:Schema.Types.ObjectId,
            required:true
        },
        token:{
            type:Number,
            required:true
        },
        startTime:{
            type:String,
            required:true
        },
        endTime:{
            type:String,
            required:true
        },
        date:{
            type:Date,
        }
    },
    {
        timestamps:true
    }
)

const Booking = model<IBooking>("bookings",bookingSchema)

export default Booking;