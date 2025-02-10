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
    date: Date
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
        date: {
            type: Date,
            required: true,
        }
    },
    {
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
    }
)

export const CustomerBill = model<ICustomerBill>('customerBills', customerBillSchema);