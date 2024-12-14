import { NextFunction, Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Staff from "../../models/staffModel";
import bcrypt, { hash } from "bcryptjs";
import Store from "../../models/storeModel";
import { RequestWithStaff } from "../../utils/interfaces/interfaces";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import twilio from "twilio";
import { ICustomRequest } from "../../types/requestion";
import {
  IAddStoreSchema,
  ICheckDetailsAndSendOtp,
  IUpdateStoreSchema,
} from "../../schemas/store.schema";
import { getStoreByPhoneOrUniqueName } from "../../service/store";
import { sendTwilioOtp, verifyTwilioOtp } from "../../utils/twilio";
import { getNextYearSameDateMinusOneDay } from "../../utils/misc";

const { TWILIO_ACCOUNT_SID, TWILIO_AUTHTOKEN } = process.env;
const twilioclient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTHTOKEN, {
  lazyLoading: true,
});

const twilioServiceId = process.env.TWILIO_SERVICE_ID;
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !email.includes("@") || !password || password.trim === "") {
      res.status(422).json({ message: "Invalid input." });
      return;
    }
    const user = await Staff.findOne({ email });

    if (!user) {
      return res
        .status(404)
        .json({ message: "Please check your email", login: false });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res
        .status(400)
        .json({ message: "Invalid password", login: false });
    }
    const token = user.generateAuthToken(user._id);
    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: token,
      status: "ok",
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const checkStoreDetailsAndSendOtpHandler = asyncHandler(
  async (
    req: ICustomRequest<ICheckDetailsAndSendOtp>,
    res: Response
  ): Promise<void> => {
    const { phone, uniqueName } = req.body;

    const phoneOrUniqueNameAlreadyExist = await getStoreByPhoneOrUniqueName(
      phone,
      uniqueName
    );

    if (phoneOrUniqueNameAlreadyExist) {
      res.status(409).json({
        message:
          phoneOrUniqueNameAlreadyExist.phone === phone
            ? "Phone number already exist"
            : "Unique name already exist",
      });
    } else {
      await sendTwilioOtp(phone);
      res.status(200).json({ message: "otp sends successfully" });
    }
  }
);

export const addOrUpdateStore = async (
  req: ICustomRequest<IAddStoreSchema | IUpdateStoreSchema>,
  res: Response
) => {
  const staffId = req?.user?._id;
  const storeId = req.params?.storeId;

  // Check if storeId exists to determine whether it's an update or add operation
  const isUpdate = !!storeId;

  const { shopImgUrl, subscriptionPlan, latitude, longitude, ...rest } =
    req.body;

  let uniqueName, otp, phone, password, currentSubscriptionPlan;

  if (isUpdate) {
    // Fetch the store to check if it exists and was added by the current staff
    const store = await Store.findOne({ _id: storeId, addedBy: staffId });
    if (!store) {
      return res
        .status(404)
        .json({ message: "Store not found or not authorized" });
    }
    currentSubscriptionPlan = store.subscription.plan;
  } else {
    // Add new store logic
    uniqueName = (req.body as IAddStoreSchema).uniqueName;
    otp = (req.body as IAddStoreSchema).otp;
    phone = (req.body as IAddStoreSchema).phone;

    const phoneOrUniqueNameAlreadyExist = await getStoreByPhoneOrUniqueName(
      phone,
      uniqueName
    );

    if (phoneOrUniqueNameAlreadyExist) {
      return res.status(409).json({
        message:
          phoneOrUniqueNameAlreadyExist.phone === phone
            ? "Phone number already exists"
            : "Unique name already exists",
      });
    }

    // const verified = await verifyTwilioOtp(phone, otp);
    // if (!verified) {
    //   return res.status(403).json({ message: "Invalid OTP" });
    // }
    const salt = await bcrypt.genSalt(10);
    password = await bcrypt.hash(phone, salt);
  }

  const location = {
    type: "Point",
    coordinates: [longitude, latitude],
  };

  const storeDetails: any = {
    ...(uniqueName && password && phone && { uniqueName, password, phone }),
    location,
    shopImgUrl,
    addedBy: staffId,
    ...rest,
  };

  // Update subscription details if the plan has changed or if adding a new store
  if (!isUpdate || subscriptionPlan !== currentSubscriptionPlan) {
    storeDetails.subscription = {
      plan: subscriptionPlan,
      activatedAt: Date.now(),
      expiresAt: getNextYearSameDateMinusOneDay(),
    };
  }

  // If updating, ensure the store is updated and not added
  if (isUpdate) {
    await Store.updateOne({ _id: storeId, addedBy: staffId }, storeDetails);

    await Staff.updateOne(
      { _id: staffId },
      {
        $inc: { addedStoresCount: +1 },
      }
    );

    res.status(200).json({ message: "Store updated" });
  } else {
    const newStore = new Store(storeDetails);
    await newStore.save();
    res.status(201).json({ message: "Store created" });
  }
};

export const getStaffStore = asyncHandler(
  async (req: Request, res: Response) => {
    const id = req.params.storeId;
    const staffId = req.user?._id;

    const store = await Store.findOne({ _id: id, addedBy: staffId })
      .select(["-password"])
      .populate("category", { _id: 1, name: 1 })
      .populate("subscription.plan", { _id: 1, name: 1 });

    if (!store) {
      res.status(404).json({ message: "store not found" });
    } else {
      res.status(200).json(store);
    }
  }
);

export const searchUniqueNameExist = asyncHandler(
  async (req: Request, res: Response) => {
    let { uniqueName } = req.params;
    try {
      uniqueName =
        typeof uniqueName === "string" ? uniqueName?.toLowerCase() : "";
      const store = await Store.find({ uniqueName: uniqueName });
      if (store.length > 0) {
        res
          .status(200)
          .json({ message: "This name already taken.", isUnique: false });
      } else {
        res
          .status(200)
          .json({ message: "This name available", isUnique: true });
      }
    } catch (error) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
);

export const fetchAllStore = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user._id;

  try {
    const staff: any = await Staff.findById(userId);

    if (!staff) {
      res.status(400).json({ message: "You are not a staff" });
    }

    const storesAddedByStaff = await Store.find({ addedBy: userId });
    const addedStores = storesAddedByStaff.map((item) => {
      return item.id;
    });

    const stores = await Store.aggregate([
      {
        $match: {
          _id: {
            $in: addedStores.map(
              (storeId: any) => new mongoose.Types.ObjectId(storeId)
            ),
          },
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "categoryDetails",
        },
      },
      {
        $set: {
          category: {
            $arrayElemAt: ["$categoryDetails.name", 0],
          },
        },
      },
      {
        $project: {
          categoryDetails: 0,
        },
      },
    ]);

    res.status(200).json(stores);
  } catch (error) {
    console.log(error);
  }
});

export const updateStoreStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { storeId }: any = req.params;
    const store = await Store.findById(storeId);

    if (!store) {
      return res.status(404).json({ message: "Store not found" });
    }

    store.isActive = !store.isActive;
    await store.save();

    return res
      .status(200)
      .json({ message: "Store status updated successfully", store });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const changePassword = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  try {
    const { password, newPassword, reEnterPassword } = req.body;
    const user = req.user._id;

    if (newPassword !== reEnterPassword) {
      res
        .status(400)
        .json({ message: "Password mismatch. Please type same password" });
    }

    if (!mongoose.Types.ObjectId.isValid(user)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const userData: any = await Staff.findById(user);
    if (!userData) {
      return res.status(404).json({ message: "User not found" });
    }

    const match = await bcrypt.compare(password, userData.password);
    if (match) {
      const hashPassword = await bcrypt.hash(reEnterPassword, 10);

      const response = await Staff.findByIdAndUpdate(
        user,
        {
          password: hashPassword,
        },
        { new: true }
      );

      res.status(200).json({ message: "Password updated successfully" });
    } else {
      res.status(400).json({ message: "Current password is incorrect" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getStaffById = async (req: any, res: Response) => {
  try {
    const id = req.user._id;

    const staff = await Staff.findById(id);
    if (!staff) {
      return res.status(404).json({ message: "Staff not found" });
    }

    res.status(200).json(staff);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteStore = asyncHandler(async (req: any, res: Response) => {
  try {
    const staffId = req.user._id;
    const storeId = req.params.storeId;

    const store: any = await Store.findById(storeId);

    if (!store) {
      res.status(404).json({ message: "Store not found" });
    }

    await Store.findByIdAndDelete(storeId);

    await Staff.findByIdAndUpdate(
      staffId,
      { $inc: { addedStoresCount: -1 } },
      { new: true }
    );

    res.status(200).json({ message: "store deleted successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export const forgotPasswordOtpSendToPhone = async (
  req: Request,
  res: Response
) => {
  try {
    const { phone } = req.body;
    const staff = await Staff.findOne({ phone });

    if (!staff) {
      return res.status(404).json({ message: "Invalid number" });
    }

    if (!twilioServiceId) {
      return res
        .status(500)
        .json({ message: "Twilio service id is not configured" });
    }

    const otpResponse = await twilioclient.verify.v2
      .services(twilioServiceId)
      .verifications.create({
        to: `+91${phone}`,
        channel: "sms",
      });

    const token = jwt.sign(
      { phone },
      process.env.JWT_SECRET_FOR_PASSWORD_RESET!,
      { expiresIn: "10m" }
    );
    res.status(201).json({
      message: `otp send successfully : ${JSON.stringify(otpResponse)}`,
      otpSend: true,
      token,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const OtpVerify = async (req: Request, res: Response) => {
  try {
    const { token, otp } = req.body;
    const decodedPhone: any = jwt.verify(
      token,
      process.env.JWT_SECRET_FOR_PASSWORD_RESET!
    );

    const staff = await Staff.findOne({ phone: decodedPhone.phone });

    if (!staff) {
      return res.status(404).json({ message: "Invalid token" });
    }
    if (!twilioServiceId) {
      return res
        .status(500)
        .json({ message: "Twilio service ID is not configured." });
    }

    const verifiedResponse = await twilioclient.verify.v2
      .services(twilioServiceId)
      .verificationChecks.create({
        to: `+91${decodedPhone.phone}`,
        code: otp,
      });

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
    res.status(500).json({ message: "Internal server error", error });
  }
};

export const updatePassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    const decodedPhone: any = jwt.verify(
      token,
      process.env.JWT_SECRET_FOR_PASSWORD_RESET!
    );

    const user = await Staff.findOne({ phone: decodedPhone.phone });

    if (!user) {
      res.status(404).json({ message: "User not found for this number" });
    }

    const hashPassword = await bcrypt.hash(newPassword, 10);

    const response = await Staff.findByIdAndUpdate(
      user,
      {
        password: hashPassword,
      },
      { new: true }
    );
    res.status(201).json({
      message: "Password changed successfully",
      response,
      updated: true,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({ message: "Internal server error", error });
  }
};
