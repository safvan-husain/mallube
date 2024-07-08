import { NextFunction, Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Staff from "../../models/staffModel";
import bcrypt, { hash } from "bcryptjs";
import Store from "../../models/storeModel";
import { RequestWithStaff } from "../../utils/interfaces/interfaces";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import twilio from "twilio";

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

  if(!user){
    return res.status(404).json({message:"Please check your email",login:false})
  }
    const match = await bcrypt.compare(password, user.password);
    if(!match){
      return res.status(400).json({message:"Invalid password",login:false})
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
    res.status(500).json({message:"Internal server error"})
  }
  
 
}

export const addStore = async (req: any, res: Response) => {
  const staff = req.user._id;
  let {
    storeName,
    uniqueName,
    storeOwnerName,
    shopImgUrl,
    district,
    address,
    location,
    phone,
    email,
    category,
    bio,
    wholeSale,
    retail,
  } = req.body;

  try {
    const phoneExist = await Store.find({ phone });
    if (phoneExist.length > 0) {
      return res.status(400).json({ message: "Phone number already exist." });
    }

    if (location && location.coordinates) {
      const { coordinates } = location;
      if (Array.isArray(coordinates) && coordinates.length === 2) {
        const [longitude, latitude] = coordinates;
        if (typeof longitude === "number" && typeof latitude === "number") {
          location = {
            type: "Point",
            coordinates: [longitude, latitude],
          };
        } else {
          return res.status(400).json({ message: "Invalid coordinates" });
        }
      }
    }

    const salt = await bcrypt.genSalt(10);
    const password = await bcrypt.hash(phone, salt);
    const store = new Store({
      storeName,
      uniqueName,
      storeOwnerName,
      address,
      location,
      phone,
      email,
      password: password,
      shopImgUrl,
      category,
      addedBy: staff,
      bio,
      district,
      wholeSale,
      retail,
    });

    await store.save();

    const staffId = (req as RequestWithStaff).user._id;
    await Staff.updateOne(
      { _id: staffId },
      {
        //  $push: { addedStores: store._id },
        $inc: { addedStoresCount: +1 },
      }
    );

    res.status(201).json({
      message: "Store created",
    });
  } catch (error) {
    console.log(error);
  }
};

export const searchUniqueNameExitst = asyncHandler(
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

    // const addedStores = staff.addedStores;
    // console.log("addedsstores ",addedStores)

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

    store.status = store.status === "active" ? "inactive" : "active";
    await store.save();

    return res
      .status(200)
      .json({ message: "Store status updated successfully", store });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateStore = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { storeId }: any = req.params;

    const updatedFields = req.body;

    // Check and format the location field
    if (updatedFields.location && updatedFields.location.coordinates) {
      const { coordinates } = updatedFields.location;
      if (Array.isArray(coordinates) && coordinates.length === 2) {
        const [longitude, latitude] = coordinates;
        if (typeof longitude === "number" && typeof latitude === "number") {
          updatedFields.location = {
            type: "Point",
            coordinates: [longitude, latitude],
          };
        } else {
          return res
            .status(400)
            .json({ message: "Invalid coordinates format" });
        }
      } else {
        return res.status(400).json({ message: "Invalid coordinates format" });
      }
    }

    const updatedStore = await Store.findByIdAndUpdate(storeId, updatedFields, {
      new: true,
      runValidators: true,
    });

    if (!updatedStore) {
      return res.status(404).json({ message: "Store not found" });
    }

    res
      .status(200)
      .json({ message: "Store updated successfully", store: updatedStore });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error", error });
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

export const forgotPasswordOtpSendToPhone = async (req:Request,res:Response)=>{
  try {
    const {phone} = req.body
    const staff = await Staff.findOne({phone})
    
    if(!staff){
      return res.status(404).json({message:"Invalid number"})
    }

    if(!twilioServiceId){
      return res.status(500).json({message:"Twilio service id is not configured"})
    };

    const otpResponse = await twilioclient.verify.v2
    .services(twilioServiceId)
    .verifications.create({
      to: `+91${phone}`,
      channel: "sms",
    });

    const token = jwt.sign(
      {phone},
      process.env.JWT_SECRET_FOR_PASSWORD_RESET!,
      {expiresIn:"10m"}
    );
    res.status(201).json({
      message:`otp send successfully : ${JSON.stringify(otpResponse)}`,
      otpSend:true,
      token,
    })

  } catch (error) {
    console.log(error)
    res.status(500).json({message:"Internal server error"})
  }
}

export const OtpVerify = async (req:Request,res:Response) => {
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
    res.status(500).json({ message: "Internal server error" ,error});
  }
}


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
    res
      .status(201)
      .json({
        message: "Password changed successfully",
        response,
        updated: true,
      });
  } catch (error) {
    console.log(error);
    
    res.status(500).json({ message: "Internal server error" ,error});
  }
};