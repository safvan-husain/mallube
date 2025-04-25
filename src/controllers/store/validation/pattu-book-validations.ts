import { z } from 'zod';
import { Types } from "mongoose";

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