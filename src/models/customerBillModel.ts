import { model, Schema, Document } from "mongoose";

interface SingleProductItemBill {
    particular: string;
    qty: number;
    amount: number;
}


interface ICustomerBill extends Document {
    _id: Schema.Types.ObjectId;
    customerId: Schema.Types.ObjectId;
    items: SingleProductItemBill[],
    totalAmount: number;
    timestamp: string
}

const customerBillSchema = new Schema<ICustomerBill>(
    {
        customerId: {
            type: Schema.Types.ObjectId,
            ref: 'customers'
        },
        items: {
            type: [],
            default: []
        },
        totalAmount: {
            type: Number,
            default: 0
        },
        timestamp: {
            type: String,
            required: true,
        }
    },
    {
        timestamps: true
    }
)

export const CustomerBill = model<ICustomerBill>('customerBills', customerBillSchema);