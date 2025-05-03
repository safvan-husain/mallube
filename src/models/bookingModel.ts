import { Schema, model, Document } from "mongoose";
import {z} from "zod";

export const bookingStatusSchema = z.enum(['pending', 'confirmed', 'canceled']);
type IBookingStatus = z.infer<typeof bookingStatusSchema>;

//TODO: remove uneccessery fields later.
export interface IBooking extends Document {
    timeSlotId: Schema.Types.ObjectId;
    storeId: Schema.Types.ObjectId;
    userId: Schema.Types.ObjectId;
    token:number;
    startTime:Date,
    endTime:Date,
    date:Date;
    //not saving name anymore.
    name:string;
    phone:string;
    doctor:Schema.Types.ObjectId;
    // isActive -> isConfirm
    isActive: boolean;
    createdAt: Date;
    status: IBookingStatus;
}

const bookingSchema = new Schema<IBooking>(
    {
        timeSlotId:{
            type:Schema.Types.ObjectId,
        },
        storeId:{
            type:Schema.Types.ObjectId,
            ref: 'stores',
            required: true
        },
        isActive: {
            type: Boolean,
            default: false,
        },
        userId:{
            type:Schema.Types.ObjectId,
            ref: 'users',
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
            type:Date,
        },
        endTime:{
            type:Date,
        },
        doctor:{
            type:Schema.Types.ObjectId
        },
        status: {
            type: String,
            enum: ['pending', 'confirmed', 'canceled'],
            default: 'pending',
        }
    },
    {
        timestamps:true
    }
    
)

const Booking = model<IBooking>("bookings",bookingSchema)

export default Booking;