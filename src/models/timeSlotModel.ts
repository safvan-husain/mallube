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
    originalSlotCount:number;
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
          required: false,
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
        },
        originalSlotCount:{
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

// timeSlotSchema.pre('save',function(next:any){
//   if(this.isNew){
//     this.slots.forEach((slot:any)=> {
//       console.log("from pree ---- ",slot)
//       if(slot.originalSlotCount === undefined){
//         slot.originalSlotCount = slot.slotCount
//       }
//     })
//   }
//   next()
// })

const TimeSlot = models.TimeSlot ||  model<ITimeSlot>("timeSlots", timeSlotSchema);

export default TimeSlot;
