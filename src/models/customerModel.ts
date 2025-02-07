import { Document, model, Schema } from "mongoose";

export interface ICustomer extends Document {
    _id: string;
    storeId: Schema.Types.ObjectId;
    name: string,
    contact: string,
    bills: Schema.Types.ObjectId[]
}

const customerSchema = new Schema<ICustomer>(
    {
        storeId: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        name: {
            type: String,
            required: true
        },
        contact: {
            type: String,
            required: true
        },
        bills: {
            type: [Schema.Types.ObjectId],
            required: true
        }
    }
)

export const Customer = model<ICustomer>('customers', customerSchema)