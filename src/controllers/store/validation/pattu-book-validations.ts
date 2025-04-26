import { z } from 'zod';
import { Types } from "mongoose";
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
});

export const CustomerBillResponseSchema = z.object({
    _id: z.string(),
    customerId: z.string(),
    items: z.array(ItemSchema),
    totalAmount: z.number(),
    date: z.number(),
    billPhotoUrl: z.string().optional(),
});

export type CustomerBillResponse = z.infer<typeof CustomerBillResponseSchema>;

export const createBillRequestSchema =  z.object({
    customerId: ObjectIdSchema,
    items: z.array(ItemSchema),
    totalAmount: z.number(),
    date: z.number(),
    billPhotoUrl: z.string().url().optional()
})