import {z} from 'zod';
import {Types} from "mongoose";
import {ObjectIdSchema} from "../../../types/validation";

export const CustomerResponseSchema = z.object({
    name: z.string(),
    contact: z.string(),
    _id: z.instanceof(Types.ObjectId),
    totalAmount: z.number(),
    lastPurchase: z.string(),
});

export type CustomerResponse = z.infer<typeof CustomerResponseSchema>;

export const updateCustomerSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    contact: z.string().optional(),
})

export const deleteCustomersSchema = z.object({
    customerIds: z.array(z.string())
})

const ItemSchema = z.object({
    particular: z.string(),
    qty: z.number(),
    amount: z.number(),
    //TODO: remove defaults, support for non production app
    pricePerUnit: z.number().default(0),
    unit: z.string().default('kg')
});

export const createBillRequestSchema = z.object({
    customerId: ObjectIdSchema,
    items: z.array(ItemSchema),
    totalAmount: z.number(),
    date: z.number(),
    billPhotoUrl: z.string().url().optional(),
    //TODO: remove defaults, support for non production app
    receivedAmount: z.number().default(0),
    balanceAmount: z.number().default(0),
})

//TODO: remove the omit / extend (except Id), support for non production app, added due to optional fields in depended schemas.
export const CustomerBillResponseSchema = createBillRequestSchema
    .omit({
        receivedAmount: true,
        balanceAmount: true,
        items: true,
    })
    .extend({
        balanceAmount: z.number(),
        receivedAmount: z.number(),
        _id: z.string(),
        items: z.array(ItemSchema.extend({pricePerUnit: z.number(), unit: z.string()})),
    });

export type CustomerBillResponse = z.infer<typeof CustomerBillResponseSchema>;

export const updatePattuBookRequestSchema = createBillRequestSchema
    .omit({customerId: true})
    .extend({id: ObjectIdSchema})
    .partial();

export const createCustomerRequestSchema = z.object({
    name: z.string(),
    contact: z.string()
})