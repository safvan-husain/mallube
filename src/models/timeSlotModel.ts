import {prop, getModelForClass, modelOptions, Ref, ReturnModelType, DocumentType} from '@typegoose/typegoose';

@modelOptions({
    schemaOptions: {
        timestamps: true,
    },
})
export class TimeSlot {
    @prop({ required: true, ref: 'stores' })
    public storeId!: Ref<any>; // You can replace 'any' with your actual Store class if using Typegoose for that too

    @prop({ required: true })
    public date!: Date;

    @prop({ required: true })
    public startTime!: Date;

    @prop({ required: true })
    public endTime!: Date;

    @prop({ required: true })
    public numberOfAvailableSeats!: number;

    @prop({ required: true })
    public numberOfTotalSeats!: number;

    @prop({ required: true })
    public slotIndex!: number;

    public static async createDocument(this: ReturnModelType<typeof TimeSlot>, data: TimeSlot): Promise<DocumentType<TimeSlot>> {
        return this.create(data);
    }
}

// Create and export the model
export const TimeSlotModel = getModelForClass(TimeSlot);
