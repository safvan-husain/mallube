import { Schema, model, Document } from "mongoose";

export interface IBooking extends Document {
    timeSlotId: Schema.Types.ObjectId;
    storeId: Schema.Types.ObjectId;
    userId: Schema.Types.ObjectId;
    token:number;
    startTime:string,
    endTime:string,
    date:Date;
    name:string;
    phone:string;
    doctor:Schema.Types.ObjectId
}
const bookingSchema = new Schema<IBooking>(
    {
        timeSlotId:{
            type:Schema.Types.ObjectId,
        },
        storeId:{
            type:Schema.Types.ObjectId,
            required:true
        },
        userId:{
            type:Schema.Types.ObjectId,
            required:true
        },
        name:{
            type:String
        },
        phone:{
            type:String
        },
        token:{
            type:Number,
            default:1

        },
        startTime:{
            type:String,
        },
        endTime:{
            type:String,
        },
        date:{
            type:Date,
            expires:"1d"
        },
        doctor:{
            type:Schema.Types.ObjectId
        }
        
    },
    {
        timestamps:true
    }
    
)

const Booking = model<IBooking>("bookings",bookingSchema)

export default Booking;