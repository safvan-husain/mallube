import asyncHandler from "express-async-handler";
import {Response} from "express";
import {onCatchError} from "../service/serviceContoller";
import {ICustomRequest} from "../../types/requestion";
import Booking from "../../models/bookingModel";
import {paginationSchema} from "../../types/validation";

export const getBookingHistory = asyncHandler(
    async (req: ICustomRequest<any>, res: Response) => {
        try {
            if (!req.store?._id) {
                res.status(403).json({message: "Forbidden"})
                return;
            }
            const {skip, limit} = paginationSchema.parse(req.query);
            const bookings: any[] = await Booking
                .find({storeId: req.store._id}, {
                    name: true,
                    phone: true,
                    startTime: true,
                    endTime: true,
                    createdAt: true,
                    isActive: true,
                    userId: true
                })
                .skip(skip)
                .limit(limit)
                .populate('userId', 'fullName phone')
                .lean();
            res.status(200).json(bookings.map(e => ({
                ...e,
                createdAt: e.createdAt?.getTime(),
                startTime: e.startTime?.getTime(),
                endTime: e.endTime?.getTime(),
            })));
        } catch (e) {
            onCatchError(e, res);
        }
    }
)

export const getTodayBookings = asyncHandler(
    async (req: ICustomRequest<any>, res: Response) => {
        try {
            if (!req.store?._id) {
                res.status(403).json({message: "Forbidden"})
                return;
            }
            const {skip, limit} = paginationSchema.parse(req.query);

            // Create start and end of today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const bookings: any[] = await Booking
                .find({
                    storeId: req.store._id,
                    createdAt: {
                        $gte: today,
                        $lt: tomorrow
                    }
                }, {
                    name: true,
                    phone: true,
                    startTime: true,
                    endTime: true,
                    createdAt: true,
                    isActive: true
                })
                .skip(skip)
                .limit(limit).lean();
            res.status(200).json(bookings.map(e => ({
                ...e,
                createdAt: e.createdAt?.getTime()
            })));
        } catch (e) {
            onCatchError(e, res);
        }
    }
)

