import { z } from "zod";
import {bookingStatusSchema} from "../../../models/bookingModel";
import {paginationSchema} from "../../../schemas/commom.schema";
import {Types} from "mongoose";

export const BookingHistoryItemSchema = z.object({
    _id: z.any(),
    name: z.string(),
    phone: z.string(),
    startTime: z.number().optional(),   // getTime() returns number
    endTime: z.number().optional(),
    createdAt: z.number().optional(),
    status: z.string().optional(),  // will default to "pending" in response
});

export type BookingHistoryItem = z.infer<typeof BookingHistoryItemSchema>;

export const getBookingHistoryRequestSchema = z.object({
    status: bookingStatusSchema.optional(),
}).merge(paginationSchema)

export const TodayBookingItemSchema = z.object({
    timeslot: z.object({
        startTime: z.number(),
        endTime: z.number()
    }),
    customer: z.object({
        fullName: z.string(),
        phone: z.string()
    })
})

export const addTimeSlotSchema = z.object({
    startTime: z.number(),
    endTime: z.number(),
    numberOfTotalSeats: z.number(),
    slotIndex: z.number(),
});

export const timeSlotResponseSchema = z.object({
    slotIndex: z.number(),
    startTime: z.number(),
    endTime: z.number(),
    numberOfTotalSeats: z.number(),
    _id: z.union([z.string(), z.instanceof(Types.ObjectId)]),
});

export type TimeSlotStoreResponse = z.infer<typeof timeSlotResponseSchema>;