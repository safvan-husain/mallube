import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import User from "../../models/userModel";
import bcrypt, { hash } from "bcryptjs";
// import twilio from "twilio";
import Cart from "../../models/cartModel";
import { ICustomRequest } from "../../types/requestion";
import { IAddCartSchema } from "../../schemas/cart.schema";
import Product from "../../models/productModel";
import jwt, { decode } from "jsonwebtoken";
import TimeSlot, { ITimeSlot } from "../../models/timeSlotModel";
import Booking from "../../models/bookingModel";
import TokenNumber from "../../models/tokenModel";
import Doctor from "../../models/doctorModel";
import Store from "../../models/storeModel";
import mongoose from "mongoose";
import Specialisation from "../../models/specialisationModel";

const { TWILIO_ACCOUNT_SID, TWILIO_AUTHTOKEN } = process.env;
// const twilioclient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTHTOKEN, {
//   lazyLoading: true,
// });

const twilioServiceId = process.env.TWILIO_SERVICE_ID;

const EXPIRATION_TIME = 5 * 60 * 1000;

export const register = async (req: Request, res: Response) => {
  const { fullName, email, password, phone } = req.body;
  try {
    const exist: any = await User.findOne({
      $or: [{ email }, { phone }],
    });

    if (exist) {
      const currentTime = new Date().getTime();
      const userCreationTime = new Date(exist.createdAt).getTime();
      //Handling user otp verification in second attempt
      if (
        !exist.isVerified &&
        currentTime - userCreationTime > EXPIRATION_TIME
      ) {
        await User.deleteOne({ _id: exist._id });
      } else {
        res.status(422).json({ message: "email or phone already been used!" });
      }
    }
    //hash the password
    const hashedPassword = await bcrypt.hash(password, 12);

    //generate otp
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    //create new user
    const user = new User({
      fullName,
      email,
      password: hashedPassword,
      phone,
      otp,
      isVerified: true,
    });

    await user.save();

    if (!twilioServiceId) {
      return res
        .status(500)
        .json({ message: "Twilio service ID is not configured." });
    }
    // const otpResponse = await twilioclient.verify.v2
    //   .services(twilioServiceId)
    //   .verifications.create({
    //     to: `+91${phone}`,
    //     channel: "sms",
    //   });
    res.status(201).json({
      message: `otp send successfully`,
      otpSend: true,
    });
  } catch (error) {
    console.log(error);
  }
};

//verify otp
export const verifyOtp = async (req: Request, res: Response) => {
  if (!twilioServiceId) {
    return res
      .status(500)
      .json({ message: "Twilio service ID is not configured." });
  }
  try {
    const { phone, otp } = req.body;
    //find user by email
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // const verifiedResponse = await twilioclient.verify.v2
    //   .services(twilioServiceId)
    //   .verificationChecks.create({
    //     to: `+91${phone}`,
    //     code: otp,
    //   });

    const verifiedResponse = { status: "approved" };

    //mark user as verified if otp is verified true
    if (verifiedResponse.status === "approved") {
      user.isVerified = true;
      await user.save();
      res.status(200).json({
        message: `OTP verified successfully : ${JSON.stringify(
          verifiedResponse
        )}`,
        verified: true,
      });
    } else {
      res
        .status(400)
        .json({ message: "Wrong OTP , please check again", verified: false });
    }
  } catch (error) {
    console.log(error);
  }
};

export const login = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    const user: any = await User.findOne({
      $or: [{ email: username }, { phone: username }],
    });
    if (!user) {
      res.status(404).json({ message: "Invalid email or phone", login: false });
    }

    if (user?.isBlocked) {
      res.status(400).json({ message: "You are blocked. Contact the owner" });
    }

    //verify password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      res.status(400).json({ message: "Invalid password", login: false });
    }

    //check if user is verified
    if (!user.isVerified) {
      res.status(400).json({ message: "Please verify your account" });
    }

    //generate jwt token
    // const token = user.generateAuthToken(user._id);

    // res.status(200).json({ message: "Login successful", token });

    if (match) {
      const token = user.generateAuthToken(user._id);
      res.status(200).json({
        _id: user._id,
        name: user.fullName,
        email: user.email,
        phone: user.phone,
        token: token,
        statusText: "ok",
      });
    } else {
      res.status(500).json({ message: "email or password wrong!" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error", error });
  }
});

//CART
export const addToCart = asyncHandler(
  async (req: ICustomRequest<IAddCartSchema>, res: Response) => {
    const userId = req.user!._id;
    const { productId, quantity } = req.body;

    const productDetails = await Product.findOne({ _id: productId }).select({
      store: true,
    });

    if (!productDetails) throw new Error("Product not found");

    const { store: storeId } = productDetails;

    try {
      // Update existing product or add new product in one query

      const isExists = await Cart.findOne({
        userId,
        storeId,
        "cartItems.productId": productId,
      });

      if (isExists) {
        await Cart.findOneAndUpdate(
          {
            userId,
            storeId,
            "cartItems.productId": productId,
          },
          {
            $set: {
              "cartItems.$.quantity": quantity,
            },
          }
        );
      } else {
        await Cart.findOneAndUpdate(
          {
            userId,
            storeId,
          },
          {
            $push: {
              cartItems: {
                productId,
                quantity,
              },
            },
          },
          {
            upsert: true,
            new: true,
            rawResult: true,
          }
        );
      }

      res.status(200).send("ok");
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

export const getCart = asyncHandler(
  async (req: ICustomRequest<IAddCartSchema>, res: Response) => {
    const userId = req.user!._id;
    const { storeId } = req.params;
    const result = await Cart.findOne({ userId, storeId }).populate({
      path: "cartItems.productId",
      model: "products",
    });
    const cartItems = result?.cartItems || [];
    res.status(200).send(cartItems);
  }
);

export const removeCart = asyncHandler(
  async (req: ICustomRequest<IAddCartSchema>, res: Response) => {
    const userId = req.user!._id;
    const { storeId } = req.params;
    await Cart.deleteOne({ userId, storeId });
    res.status(200).send("ok");
  }
);

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user || !user._id) {
      return res.status(404).json({ message: "User not found" });
    }

    const updatingValues = req.body;

    // Perform the update and log the response
    const response = await User.findByIdAndUpdate(
      user._id,
      { $set: updatingValues },
      { new: true }
    ).exec(); // Add exec() to return a Promise

    if (!response) {
      return res.status(404).json({ message: "User not found after update" });
    }

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const forgetPasswordOtpSend = async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;

    const exist = await User.findOne({ phone });

    if (!exist) {
      return res.status(404).json({ message: "Invalid number" });
    }

    if (!twilioServiceId) {
      return res
        .status(500)
        .json({ message: "Twilio service ID is not configured." });
    }

    // const otpResponse = await twilioclient.verify.v2
    //   .services(twilioServiceId)
    //   .verifications.create({
    //     to: `+91${phone}`,
    //     channel: "sms",
    //   });
    const otpResponse = { status: "test variable data" };

    const token = jwt.sign(
      { phone },
      process.env.JWT_SECRET_FOR_PASSWORD_RESET!,
      { expiresIn: "10m" }
    );
    res.status(201).json({
      message: `otp send successfully : ${JSON.stringify(otpResponse)} `,
      otpSend: true,
      token,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const verifyOtpForPasswrodReset = async (
  req: Request,
  res: Response
) => {
  try {
    const { token, otp } = req.body;

    const decodedPhone: any = jwt.verify(
      token,
      process.env.JWT_SECRET_FOR_PASSWORD_RESET!
    );

    const user = await User.findOne({ phone: decodedPhone.phone });

    if (!user) {
      return res.status(404).json({ message: "Invalid token" });
    }
    if (!twilioServiceId) {
      return res
        .status(500)
        .json({ message: "Twilio service ID is not configured." });
    }

    // const verifiedResponse = await twilioclient.verify.v2
    //   .services(twilioServiceId)
    //   .verificationChecks.create({
    //     to: `+91${decodedPhone.phone}`,
    //     code: otp,
    //   });

    const verifiedResponse = { status: "approved" };

    //mark user as verified if otp is verified true
    if (verifiedResponse.status === "approved") {
      res.status(200).json({
        message: `OTP verified successfully : ${JSON.stringify(
          verifiedResponse
        )}`,
        verified: true,
      });
    } else {
      res.status(400).json({ message: "Otp is wrong" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updatePassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    const decodedPhone: any = jwt.verify(
      token,
      process.env.JWT_SECRET_FOR_PASSWORD_RESET!
    );

    const user = await User.findOne({ phone: decodedPhone.phone });

    if (!user) {
      res.status(404).json({ message: "User not found for this number" });
    }

    const hashPassword = await bcrypt.hash(newPassword, 10);

    const response = await User.findByIdAndUpdate(
      user,
      {
        password: hashPassword,
      },
      { new: true }
    );
    res.status(200).json({
      message: "Password changed successfully",
      response,
      updated: true,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateProfilePassword = async (req: Request, res: Response) => {
  try {
    const { currentPassword, confirmPassword } = req.body;

    const userId = req.user?._id;

    const user: any = await User.findOne({ _id: userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }
    const hashedPassword = await bcrypt.hash(confirmPassword, 10);
    user.password = hashedPassword;
    await user.save();
    res.status(200).json({
      message: "Password updated successfully",
      user,
      passwordUpdated: true,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const fetchUser = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
};

export const fetchTimeSlot = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) return res.status(400).json({ message: "Store id is required" });

    const slot: any = await TimeSlot.find({ storeId: id }); // here except slots which booking id having the slot id.

    if (!slot || slot.length === 0) {
      return res.status(404).json({ message: "No time slot for this store" });
    }

    const availableSlots = slot[0].slots.filter(
      (slot: any) => slot.slotCount > 0
    );
    res.status(200).json(availableSlots);
  } catch (error) {
    console.log("error while fetching slots ", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};

export const slotBooking = async (req: any, res: Response) => {
  try {
    const { slotId, date, startTime, endTime, storeId } = req.body;

    const bookings: any = await Booking.find({ storeId: storeId });

    if (bookings.length === 0) {
      await TokenNumber.findOneAndUpdate(
        { storeId: storeId },
        { $set: { tokenNumber: 0 } }
      );
    }

    const userId = req.user._id;
    // Validate the slotData and storeId
    if (!slotId || !storeId) {
      return res.status(400).json({ message: "Invalid booking data" });
    }
    // check if the slot is available
    const timeslots: any = await TimeSlot.findOneAndUpdate(
      {
        storeId: storeId,
        "slots._id": slotId,
      },
      {
        $inc: { "slots.$.slotCount": -1 },
      },
      { new: true }
    );

    const token = await TokenNumber.findOneAndUpdate(
      { storeId },
      { $inc: { tokenNumber: 1 }, userId: userId },
      { new: true, upsert: true }
    );

    const newBooking = new Booking({
      timeSlotId: slotId,
      date,
      startTime,
      endTime,
      storeId,
      userId,
      token: token.tokenNumber,
    });

    await newBooking.save();
    await timeslots.save();

    res.status(201).json({
      message: `Booking confirmed.Your token is ${token.tokenNumber}. You will get a call from shop owner.`,
      newBooking,
    });
  } catch (error) {
    console.log("booking error ", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};

export const fetchAllDoctors = async (req: Request, res: Response) => {
  try {
    const { uniqueName } = req.params;
    console.log(uniqueName);
    
    if (!uniqueName || typeof uniqueName !== "string") {
      return res
        .status(404)
        .json({
          message: "Store unique name is required and must be a string",
        });
    }

    const store = await Store.findOne({ uniqueName: uniqueName });


    if (!store) {
      return res.status(404).json({ message: "No store found" });
    }

    const doctors = await Doctor.aggregate([
      { $match: { storeId: new mongoose.Types.ObjectId(store._id) } },
      {
        $lookup: {
          from: "specialisations",
          localField: "specialisation",
          foreignField: "_id",
          as: "specialisationDetails",
        },
      },
      { $unwind: "$specialisationDetails" },
    ]);

    if (!doctors) {
      return res.status(404).json({ message: "No doctors found" });
    }

    res.status(200).json(doctors);
  } catch (error) {
    console.log("error while fetching doctors", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};

export const fetchAllSpecialisations = async (req:Request , res:Response) => {
  try {
    const { uniqueName } = req.params;

    
    if (!uniqueName || typeof uniqueName !== "string") {
      return res
        .status(404)
        .json({
          message: "Store unique name is required and must be a string",
        });
    }

    const store = await Store.findOne({ uniqueName: uniqueName });


    if (!store) {
      return res.status(404).json({ message: "No store found" });
    }

    const specialisations = await Specialisation.find({storeId:store?._id})

    if (!specialisations) {
      return res.status(404).json({ message: "No specialisations found" });
    }

    res.status(200).json(specialisations)


  } catch (error) {
    console.log("error while fetching specialisation", error);
    res.status(500).json({ message: "Internal server error", error });
    
  }
}