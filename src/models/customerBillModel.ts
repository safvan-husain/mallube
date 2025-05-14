import {prop, getModelForClass, Ref, modelOptions, Severity, ReturnModelType, DocumentType} from "@typegoose/typegoose";
import { Types } from "mongoose";

//TODO:: make some of the filed required, and do any old data migration.

class SingleProductItemBill {
    @prop({ required: true })
    public particular!: string;

    @prop({ required: true })
    public qty!: number;

    @prop({ required: true })
    public amount!: number;

    @prop({default: "kg" })
    public unit!: string;

    @prop({ default: 0})
    public pricePerUnit!: number;
}

@modelOptions({
    schemaOptions: {
        timestamps: true,
        toJSON: {
            transform: function (doc, ret) {
                ret.date = ret.date.getTime();
                return ret;
            }
        },
        toObject: {
            transform: function (doc, ret) {
                ret.date = ret.date.getTime();
                return ret;
            }
        }
    },
    options: {
        allowMixed: Severity.ALLOW
    }
})
class CustomerBill {
    @prop({ auto: true })
    public _id!: Types.ObjectId;

    @prop({ required: true, ref: 'customers' })
    public customerId!: Ref<any>; // Replace 'any' with your Customer class if available

    @prop({ type: () => [SingleProductItemBill], default: [] })
    public items!: SingleProductItemBill[];

    @prop({ default: 0 })
    public totalAmount!: number;

    @prop({ required: true })
    public date!: Date;

    @prop()
    public billPhotoUrl?: string;

    @prop({ default: 0})
    public receivedAmount!: number;

    @prop({ default: 0})
    public balanceAmount!: number;

    public static async createDocument(
        this: ReturnModelType<typeof CustomerBill>,
        data: Omit<CustomerBill, '_id' | 'createdAt' | 'updatedAt'>
    ): Promise<DocumentType<CustomerBill>> {
        return this.create(data);
    }
}

const CustomerBillModel = getModelForClass(CustomerBill);

export { CustomerBill, CustomerBillModel, SingleProductItemBill };