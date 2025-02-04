import { NextFunction, Request, Response } from "express";
import asyncHandler from "express-async-handler";
import bcrypt from "bcryptjs";
import Store from "../../models/storeModel";
import Advertisement from "../../models/advertisementModel";
import { calculateDistance } from "../../utils/interfaces/common";
import { populate } from "dotenv";
import Category from "../../models/categoryModel";
import mongoose from "mongoose";
import Product from "../../models/productModel";
import ProductSearch from "../../models/productSearch";
import jwt from "jsonwebtoken";
// import twilio from "twilio";
import TimeSlot from "../../models/timeSlotModel";
import Booking from "../../models/bookingModel";
import Specialisation from "../../models/specialisationModel";
import { ICustomRequest } from "../../types/requestion";
import { getStoreByPhoneOrUniqueNameOrEmail } from "../../service/store/index";
import {
  IAddStoreSchema,
  ISignUpStoreSchema
} from "../../schemas/store.schema";
import { getNextYearSameDateMinusOneDay } from "../../utils/misc";
import { store } from "../../middleware/auth";
import { FeedBack } from "../../models/feedbackModel";

const { TWILIO_ACCOUNT_SID, TWILIO_AUTHTOKEN } = process.env;
// const twilioclient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTHTOKEN, {
//   lazyLoading: true,
// });

const twilioServiceId = process.env.TWILIO_SERVICE_ID;

export const deleteStore = asyncHandler(async (req: ICustomRequest<undefined>, res: Response) => {
  const storeId = req.store?._id;
  try {
    const store = await Store.findById(storeId);
    if(!store) {
      res.status(401).json({ message: "User not found"});
      return;
    }
    await Advertisement.deleteMany({
      store: new mongoose.Types.ObjectId(req.store?._id)
    })
    await Product.deleteMany({
      store: new mongoose.Types.ObjectId(req.store?._id)
    });
    await Store.findByIdAndDelete(storeId)
    res.status(200).json({ message: "Succfully deleted" });
  } catch (error) {
    console.log("error at delete store", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export const login = async (req: Request, res: Response) => {
  try {
    const { phone, password, email } = req.body;

    let storeOwner: any;

    if (phone) {
      storeOwner = await Store.findOne({ phone });
    } else if (email) {
      storeOwner = await Store.findOne({ email });

    } else {
      return res.status(400).json({ message: "Phone or email is required" });
    }
    if (!storeOwner) {
      return res.status(404).json({ message: "User not found" });
    }

    const match = await bcrypt.compare(password, storeOwner.password);

    if (!match) {
      return res.status(400).json({ message: "Invalid password" });
    }

    const token = storeOwner.generateAuthToken();

    res.status(200).json({
      _id: storeOwner._id,
      name: storeOwner.storeOwnerName,
      email: storeOwner.email,
      token: token,
      status: "ok",
      storeProviding: storeOwner.storeProviding,
      storeName: storeOwner.storeName,
      uniqueName: storeOwner.uniqueName,
      category: storeOwner.category,
      phone: storeOwner.phone,
      location: storeOwner.location,
      shopImgUrl: storeOwner.shopImgUrl,
      bio: storeOwner.bio,
      live: storeOwner.live,
      isActive: storeOwner.isActive,
      isAvailable: storeOwner.isAvailable,
      subscription: storeOwner.subscription,
      createdAt: storeOwner.createdAt,
      updatedAt: storeOwner.updatedAt,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getProfile = async (req: any, res: Response) => {
  let storeId = req.store._id;
  try {
    const store: any[] = await Store.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(storeId),
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category_name",
        },


      },
      {
        $unwind: {
          path: "$category_name",
          preserveNullAndEmptyArrays: true
        },
      },
      {
        $addFields: {
          category_name: { $ifNull: ["$category_name", null] }
        }
      }
    ]);
    if (store.length === 0) {
      return res.status(404).json({ message: "Store not found" });
    }
    res.status(200).json(store[0]);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
}


export const signup = async (req: ICustomRequest<ISignUpStoreSchema>, res: Response) => {
  try {
    const { shopImgUrl, latitude, longitude, feedback, ...rest } = req.body;

    let uniqueName = (req.body as ISignUpStoreSchema).uniqueName;
    let phone = (req.body as ISignUpStoreSchema).phone;
    let password = (req.body as ISignUpStoreSchema).password;
    let email = (req.body as ISignUpStoreSchema).email;

    const phoneOrUniqueNameAlreadyExist = await getStoreByPhoneOrUniqueNameOrEmail(
      phone,
      uniqueName,
      email
    );

    if (phoneOrUniqueNameAlreadyExist) {
      return res.status(409).json({
        message:
          phoneOrUniqueNameAlreadyExist.phone === phone
            ? "Phone number already exists"
            : "Unique name already exists",
      });
    }

    if (password == undefined) {
      return res.status(400).json({ message: "Password is required" });
    }

    const salt = await bcrypt.genSalt(10);
    let hashedPassword = await bcrypt.hash(password, salt);

    const location = {
      type: "Point",
      coordinates: [latitude, longitude],
    };

    let storeDetails: any = {
      ...(uniqueName && password && phone && { uniqueName, password, phone }),
      location,
      shopImgUrl,
      // addedBy: staffId,
      ...rest,
    };

    storeDetails.password = hashedPassword;

    const newStore = new Store(storeDetails);
    var store = await newStore.save();
    if (feedback) {
      const newFeedback = new FeedBack({
        storeId: store._id,
        ourQuestion: "Describe your service for store",
        answer: feedback   
      });
      try {
        await newFeedback.save();
      } catch (e) {
        console.log("error saving feedback from store signup", e);
      }
    }
    const token = store.generateAuthToken();
    res.status(201).json({ message: "Store created", authToken: token });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });

  }
};
//TODO: delete duplication.
export const editStore = async (req: any, res: Response) => {
  const {
    name, email, storeName, uniqueName, category, phone,
    location, shopImageUrl, bio,
    isAvailable, subscription,
  } = req.body;

  const storeId: any = req?.store._id;
  try {
    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({ message: "Store not found" });
    }
    store.storeOwnerName = name || store.storeOwnerName;
    store.email = email || store.email;
    store.storeName = storeName || store.storeName;
    store.uniqueName = uniqueName || store.uniqueName;
    store.category = category || store.category;
    store.phone = phone || store.phone;
    store.location = location || store.location;
    store.shopImgUrl = shopImageUrl || store.shopImgUrl;
    store.bio = bio || store.bio;
    store.isAvailable = isAvailable || store.isAvailable;
    store.subscription = subscription || store.subscription;
    await store.save();
    res.status(200).json({ message: "Store updated successfully" });
  } catch (error) {
    console.log("error while edit store", error);
    res.status(500).json({ message: "Internal server error" });
  }

};

export const fetchStore = asyncHandler(
  async (req: any, res: Response, next: NextFunction): Promise<void> => {
    const storeId: any = req?.store._id;
    try {
      const store = await Store.findOne({ _id: storeId })
        .populate({
          path: "category",
          model: "categories", // Model name
          select: "name", // Field to select
        })
        .populate("subscription.plan");
      if (!store) {
        res.status(404).json({ message: "No store found" });
        return;
      }
      res.status(200).json(store);
    } catch (error) {
      next(error);
    }
  }
);

export const updateLiveStatus = async (
  req: any,
  res: Response,
) => {
  try {
    const storeId: string = req.store._id;
    const { isAvailable } = req.body;
    
    if(isAvailable == undefined || isAvailable == null) {
      res.status(401).json({ message: "isAvailable field is required"});
      return;
    }
    const store = await Store.findById(storeId);

    if (!store) {
      return res.status(404).json({ message: "Store not found" });
    }
    store.isAvailable = isAvailable;
    await store.save();

    return res
      .status(200)
      .json({ message: "Store status updated successfully", store });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const AddAdvertisement = async (req: any, res: Response) => {
  try {
    const storeId = req.store;
    const { image, radius, adPlan } = req.body;

    if (adPlan == undefined) {
      return res.status(400).json({ message: "AdPlan is required" });
    }
    const c = await Store.findById(storeId);
    const earthRadiusInMeters = 6378137; // Earth's radius in meters
    const radiusInRadians = radius / earthRadiusInMeters;
    const newAdvertisement = new Advertisement({
      image,
      store: storeId,
      radius: radius || 10,
      location: c?.location,
      radiusInRadians,
      adPlan
    });
    await newAdvertisement.save();
    res.status(201).json({ message: "Advertisement added successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteAdvertisement = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const advertisementId = req.params.advertisementId;

      const advertisement = await Advertisement.findByIdAndDelete(
        advertisementId
      );

      if (!advertisement) {
        res.status(404).json({ message: "Advertisement not found" });
        return;
      }

      res.status(200).json({ message: "Advertisement deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
);

export const fetchAllAdvertisement = async (req: any, res: Response) => {
  try {
    const storeId = req.store._id;
    // const advertisements = await Advertisement.find({ store: storeId });
    const advertisements = await Advertisement.aggregate([
      {
        $match: {
          store: new mongoose.Types.ObjectId(storeId)
        }
      },
      {
        $lookup: {
          from: 'stores', // Name of the store collection
          localField: 'store', // Field in the Product collection
          foreignField: '_id', // Field in the Store collection
          as: 'storeDetails', // Output array field
        },
      },
      {
        $unwind: '$storeDetails', // Convert the array to an object
      },
      {
        $addFields: {
          store: '$storeDetails.uniqueName', // Map storeDetails.name to store
        },
      },
      {
        $unset: 'storeDetails', // Optionally remove the storeDetails field
      },
      {
        $lookup: {
          from: 'advertisementplans', // Name of the store collection
          localField: 'adPlan', // Field in the Product collection
          foreignField: '_id', // Field in the Store collection
          as: 'ad_plan_details', // Output array field
        },
      },
      {
        $unwind: '$ad_plan_details', // Convert the array to an object
      },
      {
        $addFields: {
          plan_name: '$ad_plan_details.name', // Map storeDetails.name to store
        },
      },
      {
        $unset: 'ad_plan_details', // Optionally remove the storeDetails field
      },

    ]);
    //TODO: remove the maping for efficancy, added since some older data don't have isActive field
    res.status(200).json(advertisements.map((i) => {
      if (i.isActive == undefined) {
        i.isActive = false;
      }
      return i;
    }));
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const fetchStoresNearBy = async (req: Request, res: Response) => {
  try {
    const { longitude, latitude } = req.params;
    if (!longitude || !latitude) {
      return res
        .status(400)
        .json({ message: "Longitude and latitude are required" });
    }

    const nearStores = await Store.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
          },
          // $maxDistance: 10000, // in meters
        },
      },
      isActive: true,
      isAvailable: true,
    })
      .populate("category", "name icon")
      .limit(20);

    // distance geting wrong. need to work on this
    const storeWithDistance = nearStores.map((store) => {
      const distance = calculateDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        store.location.coordinates[1],
        store.location.coordinates[0]
      );
      return {
        ...store.toObject(),
        category: store.category,
        distance: distance.toFixed(2),
      };
    });

    res.status(200).json(storeWithDistance);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const fetchStoreByUniqueName = async (req: Request, res: Response) => {
  try {
    const { uniqueName } = req.params; // Destructure the id from req.params

    const store: any = await Store.findOne({ uniqueName: uniqueName }).populate(
      "category",
      "name"
    ); // Correctly pass the id to findById method

    if (!store) {
      return res.status(404).json({ message: "Store not found" });
    }
    let storeData: any = { store, productCategories: [] };

    if (store.category) {
      const CId = store.category._id.toString();

      const category = await Category.find({ parentId: CId }).lean();

      if (category && category.length > 0) {
        store.productCategories = category;
        storeData = { store, productCategories: [...category] };
      } else {
        return res.status(200).json(storeData);
      }
    }

    res.status(200).json(storeData);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const fetchAllStore = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const store = await Store.find().populate({
        path: "category",
        model: "categories", // Model name
        select: "name", // Field to select
      });
      if (!store) {
        res.status(404).json({ message: "No store found" });
        return;
      }
      res.status(200).json(store);
    } catch (error) {
      next(error);
    }
  }
);

export const fetchStoreByCategory = async (req: Request, res: Response) => {
  try {
    const { categoryId, longitude, latitude }: any = req.query;

    let response: any;
    if (longitude === "null" || latitude === "null") {
      return res
        .status(400)
        .json({ message: "longitude and latitude are required" });
    }
    const findStores = async (query: any) => {
      const stores = await Store.find(query);
      if (!stores || stores.length === 0) {
        return res.status(404).json({ message: "No stores found" });
      }
      const storesWithDistance = stores.map((store: any) => {
        const distance = calculateDistance(
          parseFloat(latitude),
          parseFloat(longitude),
          store.location.coordinates[1],
          store.location.coordinates[0]
        );
        return {
          ...store.toObject(),
          distance: distance.toFixed(2),
        };
      });

      return res.status(200).json(storesWithDistance);
    };

    if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
      response = await findStores({
        category: categoryId,
        location: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [parseFloat(longitude), parseFloat(latitude)],
            },
            // $maxDistance: 10000, // in meters
          },
        },
        isActive: true,
        isAvailable: true,
      });
    } else {
      response = await findStores({
        location: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [parseFloat(longitude), parseFloat(latitude)],
            },
            // $maxDistance: 10000,
          },
        },
        isActive: true,
        isAvailable: true,
      });
    }
    if (!response || response.length === 0) {
      return res.status(404).json({ message: "No stores found" });
    }
  } catch (error) {
    console.log(" fetching category  error =>>>>>>>>>>>>>>>>>>", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};

export const searchStoresByProductName = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      let productName: any = req.query.searchTerm;

      if (!productName) {
        res.status(400).json({ message: "Product name is required" });
      }

      if (productName) {
        const trimmedSearchTerm = productName.trim();
        const productSearch = await ProductSearch.findOne({
          productName: trimmedSearchTerm,
        });
        if (productSearch) {
          await ProductSearch.findOneAndUpdate(
            { productName: trimmedSearchTerm },
            { $inc: { searchCount: 1 } }
          );
        } else {
          await ProductSearch.create({
            productName: trimmedSearchTerm,
            searchCount: 1,
          });
        }
      }

      //ensure product name is a string
      productName =
        typeof productName === "string"
          ? decodeURIComponent(productName).trim()
          : "";
      //finding the product that mathc the product name
      const products = await Product.find({
        name: { $regex: productName, $options: "i" }, // Case-insensitive search
      });

      //extracts store ids from the product
      const storeIds = products.map((product) => product.store);



      const trimmedSearchTerm = productName.trim();

      const categories = await Category.find({
        name: { $regex: trimmedSearchTerm, $options: "i" }
      })

      const categoryIds = categories.map((category) => category._id);

      // const storesByCategory = await Store

      const stores = await Store.find({
        $or: [
          { storeName: { $regex: trimmedSearchTerm, $options: "i" } }, // Search store name
          { bio: { $regex: trimmedSearchTerm, $options: "i" } },        // Search bio
          { category: { $in: categoryIds } } // Search category name
        ]
      }).populate("category", "name");


      // Find products that match the search term and get the store ids
      const productss = await Product.find({
        name: { $regex: trimmedSearchTerm, $options: "i" }, // Search product name
      });

      // If products are found, get the stores that match the product
      if (productss.length > 0) {
        const productStoreIds = productss.map((product) => product.store);
        const productStores = await Store.find({
          _id: { $in: productStoreIds },
        }).populate("category", "name");

        // Combine both store results (store search + product store search)
        stores.push(...productStores);
      }

      if (stores.length === 0) {
        res
          .status(404)
          .json({ message: "No stores found for the given product" });
      }

      res.status(200).json(stores);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

export const changePassword = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  try {
    const { password, newPassword, reEnterPassword } = req.body;
    const user = req.store._id;

    if (newPassword !== reEnterPassword) {
      res
        .status(400)
        .json({ message: "Password mismatch. Please type same password" });
    }

    if (!mongoose.Types.ObjectId.isValid(user)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    const userData: any = await Store.findById(user);
    if (!userData) {
      return res.status(404).json({ message: "User not found" });
    }

    const match = await bcrypt.compare(password, userData.password);
    if (match) {
      const hashPassword = await bcrypt.hash(reEnterPassword, 10);

      await Store.findByIdAndUpdate(
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

export const forgotPasswordOtpSendToPhone = async (
  req: Request,
  res: Response
) => {
  try {
    const { phone } = req.body;
    const store = await Store.findOne({ phone });

    if (!store) {
      return res.status(404).json({ message: "Invalid number" });
    }

    if (!twilioServiceId) {
      return res
        .status(500)
        .json({ message: "Twilio service id is not configured" });
    }

    // const otpResponse = await twilioclient.verify.v2
    //   .services(twilioServiceId)
    //   .verifications.create({
    //     to: `+91${phone}`,
    //     channel: "sms",
    //   });
    const otpResponse = { data: "test temp data" }

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

    const store = await Store.findOne({ phone: decodedPhone.phone });

    if (!store) {
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

    const user = await Store.findOne({ phone: decodedPhone.phone });

    if (!user) {
      res.status(404).json({ message: "User not found for this number" });
    }

    const hashPassword = await bcrypt.hash(newPassword, 10);

    const response = await Store.findByIdAndUpdate(
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
    res.status(500).json({ message: "Internal server error", error });
  }
};

export const updateStoreProfile = async (req: any, res: Response) => {
  try {
    const storeId = req.store._id;

    const { ...updatedFields } = req.body;
    delete updatedFields._id;

    const store = await Store.findById(storeId);

    if (!store) {
      return res.status(404).json({ message: "No store found" });
    }

    // Check if the unique field value is the same as the current value
    if (updatedFields.uniqueName && updatedFields.uniqueName === store.uniqueName) {
      delete updatedFields.uniqueName;
    }
//TODO: return name of category requested by anshif.
    var response = await (await Store.findByIdAndUpdate(storeId, updatedFields, {
      new: true,
    }))?.populate({path: 'category'});

    if (!response) {
      return res.status(404).json({ message: "Update failed" });
    }
    (response as any).category_name = response?.category;

    (response as any).category = (response?.category as any)._id;
    
    res.status(200).json({
      message: "Store profile updated successfully",
      response,
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({
        message: "Duplicate key error",
        error: error.errmsg,
      });
    } else {
      res.status(500).json({ message: "Internal server error", error });
    }
  }
};

export const addTimeSlot = async (req: any, res: Response) => {
  try {
    const storeId = req.store?._id;
    const { slots } = req.body;
    console.log(slots);


    if (!storeId)
      return res.status(400).json({ message: "Store id is required" });

    if (!slots || !Array.isArray(slots))
      return res.status(400).json({ message: "Slots are required and should be an array" });

    // Ensure each slot has an originalSlotCount set
    const slotsWithOriginalCount = slots.map((slot: any) => ({
      ...slot,
      originalSlotCount: slot.slotCount !== undefined ? slot.slotCount : 1, // Set originalSlotCount to slotCount or 1
    }));

    const existingTimeSlot = await TimeSlot.findOne({ storeId });

    if (existingTimeSlot) {
      // Append new slots to existing time slots
      existingTimeSlot.slots = existingTimeSlot.slots.concat(slotsWithOriginalCount);
      await existingTimeSlot.save();
      res.status(201).json({
        message: "Time slot updated successfully",
        timeSlot: existingTimeSlot,
      });
    } else {
      // Create a new time slot entry with the provided slots
      const newTimeSlot = new TimeSlot({
        storeId,
        slots: slotsWithOriginalCount, // Use the processed slots with originalSlotCount
      });
      await newTimeSlot.save();
      res.status(201).json({
        message: "Time slot added successfully",
        timeSlot: newTimeSlot,
      });
    }
  } catch (error) {
    console.log("error while adding time slot", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};

export const fetchTimeSlot = async (req: any, res: Response) => {
  try {
    const storeId = req.store._id;

    if (!storeId) return res.status(400).json({ message: "Store id required" });

    const timeSlot = await TimeSlot.find({ storeId });

    if (!timeSlot)
      return res
        .status(404)
        .json({ message: "No timeslot found for this store." });

    res.status(200).json(timeSlot);
  } catch (error) {
    console.log("error while fetching timeslot ", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};

export const deleteTimeSlots = async (req: any, res: Response) => {
  try {
    const storeId = req.store._id;

    if (!storeId) return res.status(400).json({ message: "Store id required" });

    await TimeSlot.findOneAndDelete({ storeId });

    res.status(200).json({ message: "Timeslots deleted successfully" });
  } catch (error) {
    console.log("error while fetching timeslot ", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};

export const stockUpdate = async (req: Request, res: Response) => {
  try {
    const { proId } = req.body;
    if (!proId)
      return res.status(400).json({ message: "Product id is required." });

    const product = await Product.findById(proId);
    if (!product)
      return res.status(404).json({ message: "Product not found." });

    product.stock = !product.stock;

    await product.save();
    res.status(200).json({ message: "Stock updated successfully." });
  } catch (error) {
    console.log("error while updating stock ", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};

