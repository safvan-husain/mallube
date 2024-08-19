import mongoose from "mongoose";
import Booking from "../../models/bookingModel";
import { NextFunction, Request, Response } from "express";
import Doctor from "../../models/doctorModel";

export const fetchBookingList = async (req: any, res: Response) => {
  try {
    const storeId = req.store?._id;

    const {
      page = 1,
      pageSize = 10,
      sortColumn = "storeId",
      sortDirection = "asc",
    } = req.query;

    if (!storeId)
      return res.status(400).json({ message: "Store id is required" });

    const storeObjectId = new mongoose.Types.ObjectId(storeId);

    const bookings = await Booking.aggregate([
      { $match: { storeId: storeObjectId } },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      { $unwind: "$userDetails" },
      {
        $lookup: {
          from: "doctors",
          localField: "doctor",
          foreignField: "_id",
          as: "doctorDetails",
        },
      },
      { $unwind: { path: "$doctorDetails", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          storeId: 1,
          userId: 1,
          token: 1,
          date: 1,
          startTime: 1,
          endTime: 1,
          "userDetails.fullName": 1,
          "userDetails.email": 1,
          "userDetails.phone": 1,
          "doctorDetails.name": 1,
          "doctorDetails.imageUrl": 1,
        },
      },
      { $sort: { [sortColumn]: sortDirection === "asc" ? 1 : -1, token: 1 } },
      { $skip: (page - 1) * pageSize },
      { $limit: parseInt(pageSize) },
    ]);

    const totalBookings = await Booking.countDocuments({
      storeId: storeObjectId,
    });
    console.log("bookings ",bookings)

    if (!bookings) return res.status(404).json({ message: "No booking found" });

    res.status(200).json({ bookings, total: totalBookings });
  } catch (error) {
    console.log("error fetching bookings", error);
    res.status(500).json({ message: "Internal server error ", error });
  }
};

export const drBooking = async (req: Request, res: Response) => {
  try {
    const { doctorId, userData } = req.body;

    if (!doctorId && !userData) {
      res.status(400).json({ message: "Request not complete" });
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }
    if (doctor.token >= doctor.noOfToken) {
      return res
        .status(400)
        .json({ message: "Doctor is fully booked for today." });
    }

    doctor.token += 1;
    console.log("doctore ", doctor);
    await doctor.save();

    const booking = new Booking({
      storeId: doctor.storeId,
      userId: userData?._id,
      name: userData?.name,
      phone: userData?.phone,
      doctor: doctorId,
      token: doctor.token,
    });

    await booking.save();
    res
      .status(201)
      .json({
        message: `Booking successful. Your token number is ${booking.token} `,
        booking,
      });
  } catch (error) {
    console.log("error dr bookings", error);
    res.status(500).json({ message: "Internal server error ", error });
  }
};
