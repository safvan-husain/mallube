import asyncHandler from "express-async-handler";
import {Response} from "express";
import {ICustomRequest, TypedResponse} from "../../types/requestion";
import Booking, {bookingStatusSchema, IBooking} from "../../models/bookingModel";
import {ObjectIdSchema, paginationSchema} from "../../types/validation";
import {onCatchError} from "../../error/onCatchError";
import {runtimeValidation} from "../../error/runtimeValidation";
import {BookingHistoryItem, BookingHistoryItemSchema, getBookingHistoryRequestSchema} from "./validation/store-booking";
import {FilterQuery} from "mongoose";
import {z} from "zod";
import {TimeSlotModel} from "../../models/timeSlotModel";

export const getBookingHistory = asyncHandler(
    async (req: ICustomRequest<any>, res: TypedResponse<BookingHistoryItem[]>) => {
        try {
            const {skip, limit, status } = getBookingHistoryRequestSchema.parse(req.query);

            let dbQuery: FilterQuery<IBooking> = {
                storeId: req.store!._id,
            }

            if (status) {
                dbQuery.status = status;
            }
            const bookings = await Booking
                .find(dbQuery, {
                    startTime: true,
                    endTime: true,
                    createdAt: true,
                    isActive: true,
                    userId: true
                })
                .skip(skip)
                .limit(limit)
                .populate<{ userId?: { fullName: string, phone: string }}>('userId', 'fullName phone')
                .lean();

            const result = bookings.map(e => ({
                status: e.status ?? "pending",
                createdAt: e.createdAt?.getTime(),
                startTime: e.startTime?.getTime(),
                name: e.userId?.fullName ?? "Unknown",
                phone: e.userId?.phone ?? "Unknown",
                endTime: e.endTime?.getTime(),
            }));

            res.status(200).json(runtimeValidation(BookingHistoryItemSchema, result));
        } catch (e) {
            onCatchError(e, res);
        }
    }
)

export const getTodayBookings = asyncHandler(
    async (req: ICustomRequest<any>, res: TypedResponse<BookingHistoryItem[]>) => {
        try {
            const {skip, limit} = paginationSchema.parse(req.query);

            // Create start and end of today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const bookings = await Booking
                .find({
                    storeId: req.store!._id,
                    createdAt: {
                        $gte: today,
                        $lt: tomorrow
                    }
                }, {
                    startTime: true,
                    endTime: true,
                    createdAt: true,
                    status: true,
                    userId: true
                })
                .skip(skip)
                .populate<{ userId?: { fullName: string, phone: string }}>('userId', 'fullName phone')
                .limit(limit).lean();

            const result = bookings.map(e => ({
                status: e.status ?? "pending",
                createdAt: e.createdAt?.getTime(),
                startTime: e.startTime?.getTime(),
                name: e.userId?.fullName ?? "Unknown",
                phone: e.userId?.phone ?? "Unknown",
                endTime: e.endTime?.getTime(),
            }));

            res.status(200).json(runtimeValidation(BookingHistoryItemSchema, result));
        } catch (e) {
            onCatchError(e, res);
        }
    }
)

export const confirmBookingV2 = asyncHandler(
    async (req: ICustomRequest<any>, res: Response) => {
        try {
            const { bookingId } = z.object({
                bookingId: ObjectIdSchema
            }).parse(req.query);

            const booking = await Booking.findById(bookingId);
            if (!booking) {
                res.status(400).json({ message: "booking not found" });
                return;
            }
            const timeSlot = await TimeSlotModel.findById(booking.timeSlotId);
            if(!timeSlot) {
                res.status(400).json({ message: "time slot is not found"});
                return;
            }
            if (timeSlot.numberOfAvailableSeats > 0) {
                await TimeSlotModel.findByIdAndUpdate(
                    booking.timeSlotId,
                    { $inc: { numberOfAvailableSeats: -1 } }
                );
                booking!.status = bookingStatusSchema.enum.confirmed;
                await booking.save();
                res.status(200).json({ message: "Booking confirmed" });
            } else {
                res.status(400).json({ message: "No available seats left" });
            }
        } catch (error) {
            onCatchError(error, res);
        }
    }
);

