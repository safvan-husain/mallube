import {NextFunction, Request, Response} from "express";
import asyncHandler from "express-async-handler";
import bcrypt from "bcryptjs";
import Store, {IStore} from "../../models/storeModel";
import Advertisement from "../../models/advertisementModel";
import {calculateDistance} from "../../utils/interfaces/common";
import Category from "../../models/categoryModel";
import mongoose, {FilterQuery, Types} from "mongoose";
import Product from "../../models/productModel";
import ProductSearch from "../../models/productSearch";
import jwt from "jsonwebtoken";
import {TimeSlot} from "../../models/timeSlotModel";
import Booking, {bookingStatusSchema} from "../../models/bookingModel";
import {ICustomRequest, TypedResponse} from "../../types/requestion";
import {getStoreByPhoneOrUniqueNameOrEmail} from "../../service/store/index";
import {
  addStoreSchema, IReusableCreateStoreSchema,
  ISignUpStoreSchema,
  IUpdateStoreSchema,
  reusableCreateStoreSchema, signUpStoreSchema,
  updateStoreSchema
} from "../../schemas/store.schema";
import {FeedBack} from "../../models/feedbackModel";
import {toTimeOnly} from "../../utils/ist_time";
import {
  BusinessAccountType,
  businessAccountTypeSchema,
  createStoreValidation, savedStoreResponseSchema, updateProfileSchema,
  ZStore
} from "./validation/store_validation";
import {safeRuntimeValidation, onCatchError, runtimeValidation} from "../service/serviceContoller";
import {z} from "zod";
import {ObjectIdSchema} from "../../types/validation";
import {locationQuerySchema} from "../../schemas/localtion-schema";
import {StoreDetailsResponse, StoreDetailsSchema} from "../user/userController";
import {paginationSchema} from "../../schemas/commom.schema";
import DisplayCategory from "../../models/DisplayCategory";
import {AppError} from "../service/requestValidationTypes";

const twilioServiceId = process.env.TWILIO_SERVICE_ID;

export const deleteStore = asyncHandler(async (req: ICustomRequest<undefined>, res: Response) => {
  const storeId = req.store?._id;
  try {
    const store = await Store.findById(storeId);
    if (!store) {
      res.status(401).json({ message: "User not found" });
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
    const { phone, password, email, fcmToken } = req.body;

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

    storeOwner.fcmToken = fcmToken;
    await storeOwner.save();

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

//TODO: correct this, no need for category or aggregate.
export const getProfile = async (req: any, res: TypedResponse<ZStore>) => {
  let storeId = req.store._id;
  try {
    const store: any[] = await Store.aggregate([
      {
        $match: {
          _id: mongoose.Types.ObjectId.createFromHexString(storeId),
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
    res.status(200).json(runtimeValidation(savedStoreResponseSchema, {
      ...store[0],
      category: store[0].category?.toString(),
      categories: store[0].categories?.map((e: any) => e.toString()),
      subCategories: store[0].subCategories?.map((e: any) => e.toString())
    }));
  } catch (error) {
    onCatchError(error, res);
  }
}

export const signup = async (req: ICustomRequest<ISignUpStoreSchema>, res: Response) => {
  try {
    //don't have time to upate all into validation now, so the validation only for new fields
    //TODO: add validation.
    let s = createStoreValidation.parse(req.body);
    const { shopImgUrl, latitude, longitude, ...rest } = {
      ...req.body,
      ...s,
    };

    let uniqueName = (req.body as ISignUpStoreSchema).uniqueName;
    let phone = (req.body as ISignUpStoreSchema).phone;
    let password = (req.body as ISignUpStoreSchema).password;
    let email = (req.body as ISignUpStoreSchema).email;
    let subscriptionExpireDate = (d => new Date(d.getFullYear() + 1, d.getMonth(), d.getDate()))(new Date());

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
      subscriptionExpireDate
    };

    storeDetails.password = hashedPassword;

    const newStore = new Store(storeDetails);
    var store = await newStore.save();
    if (rest.serviceTypeSuggestion) {
      const newFeedback = new FeedBack({
        storeId: store._id,
        ourQuestion: "Describe your service for store",
        answer: rest.serviceTypeSuggestion
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
    onCatchError(error, res);
  }
};

export const testSignUp = async (req: Request, res: Response) => {
  try {
    const body = signUpStoreSchema.parse(req.body);
    let savedData = await createAndSaveStore({
      ...body,
      plainPassword: body.password
    });
    const token = savedData.dbStore.generateAuthToken();
    res.status(201).json({ message: "Store created", authToken: token });
  } catch (e) {
    onCatchError(e, res);
  }
}

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
  res: TypedResponse<{ message: string, store: any}>,
) => {
  try {
    const storeId = req.store?._id;
    if(!Types.ObjectId.isValid(storeId ?? "")) {
      res.status(403).json({ message: "Invalid user id"});
      return;
    }
    const { isAvailable } = z.object({
      isAvailable: z.boolean()
    }).parse(req.body);
  
    const store = await Store.findByIdAndUpdate(storeId, { isAvailable }, { new: true });

    if (!store) {
      return res.status(404).json({ message: "Store not found" });
    }
    
    return res
      .status(200)
      .json({ message: "Store status updated successfully", store });
  } catch (error) {
    onCatchError(error, res);
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


export const fetchStoresNearByV2 = async (req: Request, res: TypedResponse<StoreDetailsResponse[]>) => {
  try {
    const {longitude, latitude, limit, skip} = locationQuerySchema.merge(paginationSchema).parse(req.query);
    let query: FilterQuery<IStore> = {
      type: businessAccountTypeSchema.enum.business
    };

    const nearStores = await Store.find({
      ...query,
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [latitude, longitude],
          },
        },
      },
      isActive: true,
      //TODO: when closed, do we need to show on user app?
      isAvailable: true,
    }, {
      storeName: true, bio: true, address: true,
      openTime: true, closeTime: true, isDeliveryAvailable: true,
      instagram: true, facebook: true, whatsapp: true,
      phone: true, shopImgUrl: true,
      service: true, location: true, city: true, type: true,
    })
        .skip(skip)
        .limit(limit)
        .populate<{ category: { name: string } }>("category", "name")
        .populate<{ categories: { name: string }[] }>("categories", "name")
        .lean()


    //TODO: distance getting wrong. need to work on this
    const storeWithDistance = [];

    for (const tStore of nearStores) {
      const distance =
          calculateDistance(
              latitude,
              longitude,
              tStore.location.coordinates[0],
              tStore.location.coordinates[1]
          ).toFixed(2)

      const data: StoreDetailsResponse = {
        ...tStore,
        _id: tStore._id.toString(),
        categories: tStore.categories?.map(e => e.name),
        category: tStore.category?.name,
        service: tStore.service ?? false,
        distance,
      };
      const response = safeRuntimeValidation<StoreDetailsResponse>(
          StoreDetailsSchema as any,
          data
      );

      if (response.error) {
        return res.status(500).json(response.error); // Stop execution if error occurs
      }
      storeWithDistance.push(response.data);
    }
    res.status(200).json(storeWithDistance);
  } catch (error) {
    onCatchError(error, res);
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
            coordinates: [parseFloat(latitude), parseFloat(longitude)],
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
        store.location.coordinates[0],
        store.location.coordinates[1]
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
          store.location.coordinates[0],
          store.location.coordinates[1]
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
              coordinates: [parseFloat(latitude), parseFloat(longitude)],
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
              coordinates: [parseFloat(latitude), parseFloat(longitude)],
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

//TODO: need to add validation for the response.
export const fetchStoreByCategoryV2 = async (req: Request, res: Response) => {
  try {
    const { categoryId, longitude, latitude } = z.object({
      categoryId: ObjectIdSchema
    }).merge(locationQuerySchema).parse(req.query);

    let response: any;

    const findStores = async (query: any) => {
      const stores = await Store.find(query, {
        storeName: true, bio: true, address: true,
        openTime: true, closeTime: true, isDeliveryAvailable: true,
        instagram: true, facebook: true, whatsapp: true,
        phone: true, shopImgUrl: true,
        service: true, location: true, city: true
      }).populate('category');
      if (!stores || stores.length === 0) {
        return res.status(404).json({ message: "No stores found" });
      }
      const storesWithDistance = stores.map((tStore: any) => {
        const distance = calculateDistance(
          latitude,
          longitude,
          tStore.location.coordinates[0],
          tStore.location.coordinates[1]
        );
        var store = tStore.toObject();
        store.category = store.category.name;
        return {
          ...store,
          distance: distance.toFixed(2),
        };
      });

      return res.status(200).json(storesWithDistance);
    };

    let type: BusinessAccountType;
    if(req.url.includes("freelancer")) {
       type = businessAccountTypeSchema.enum.freelancer;
    } else {
       type = businessAccountTypeSchema.enum.business;
    }
    console.log(type);

      let categoryIds = (await DisplayCategory.findById(categoryId, { categories: 1 }).lean())?.categories ?? [];

      //TODO: correct , we dont need category any more, just categories.
      response = await findStores({
        $or: [{ category: categoryId, categories: { $in: categoryIds } }],
        type,
        location: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [latitude, longitude],
            },
            // $maxDistance: 10000, // in meters
          },
        },
        isActive: true,
        isAvailable: true,
      });
    if (!response || response.length === 0) {
      return res.status(404).json({ message: "No stores found" });
    }
  } catch (error) {
    onCatchError(error, res);
  }
};

//TODO: delete if not using.
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
//TODO: delete if not using. maybe using on website.
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

export const updateStoreProfile = async (req: any, res: TypedResponse<{ message: string, data: ZStore}>) => {
  try {
    const storeId = req.store?._id;
    if(!storeId) {
      return res.status(400).json({ message: "Store id is required" });
    }
    console.log(req.body);
    let updateData = updateProfileSchema.parse(req.body);
    const data = await updateStore({ storeId, updateData})

    res.status(200).json({
      message: "Store profile updated successfully",
      data,
    });
  } catch (error: any) {
      onCatchError(error, res);
  }
};

//TODO: write a function to delte all time slote and booking to be deleted.
export const addTimeSlotV2 = asyncHandler(
  async (req: ICustomRequest<any>, res: Response) => {
    try {
      let { startTime, endTime, numberOfTotalSeats, slotIndex } = req.body;
      console.log("adding time slot", req.body);

      const storeId = req.store?._id;
      //converting millisecond since epoch format to Date
      startTime = toTimeOnly(parseInt(startTime));
      endTime = toTimeOnly(parseInt(endTime));

      var timeSlot = new TimeSlot({
        slotIndex,
        storeId,
        startTime,
        endTime,
        numberOfTotalSeats,
        numberOfAvailableSeats: numberOfTotalSeats
      });
      timeSlot = await timeSlot.save();
      res.status(200).json({
        slotIndex: timeSlot.slotIndex ?? 0,
        startTime: timeSlot.startTime.getTime(),
        endTime: timeSlot.endTime.getTime(),
        numberOfTotalSeats: timeSlot.numberOfTotalSeats,
        _id: timeSlot._id,
      });
    } catch (error) {
      console.log(`error addTimeSlot V2 ${error}`);
      res.status(500).json({ message: "Internal server error", error })
    }
  }
);

export const getTimeSlotV2 = asyncHandler(
  async (req: ICustomRequest<any>, res: Response) => {
    try {
      const storeId = req.store?._id;

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const tempTimeSlots = await TimeSlot.find({ storeId, createdAt: { $gte: startOfDay } });

      let timeSlots = [];
      for (const slot of tempTimeSlots) {
        try {
          timeSlots.push(
            {
              slotIndex: slot.slotIndex ?? 0,
              startTime: slot.startTime.getTime(),
              endTime: slot.endTime.getTime(),
              numberOfTotalSeats: slot.numberOfTotalSeats,
              _id: slot._id
            }
          );
        } catch (error) {
          console.log("delete old times", error);
          //TODO:
        }
      }
      res.status(200).json(timeSlots);
    } catch (error) {
      console.log(`error addTimeSlot V2 ${error}`);
      res.status(500).json({ message: "Internal server error" })
    }
  }
);

export const deleteTimeSlotV2 = asyncHandler(
  async (req: ICustomRequest<any>, res: Response) => {
    try {
      const { id } = req.query;
      await Booking.deleteMany({ timeSlotId: id });
      await TimeSlot.findByIdAndDelete(id);
      res.status(200).json({ message: "Success" });
    } catch (error) {
      console.log(`error addTimeSlot V2 ${error}`);
      res.status(500).json({ message: "Internal server error" })
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
      const timeSlot = await TimeSlot.findById(booking.timeSlotId);
      if (timeSlot.numberOfAvailableSeats > 0) {
        await TimeSlot.findByIdAndUpdate(
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

const storeBookingResponse = z.object({
  _id: ObjectIdSchema,
  isActive: z.boolean(),
  customer: z.object({
    fullName: z.string(),
    phone: z.string(),
  }),
  timeslot: z.object({
    startTime: z.number(),
    endTime: z.number(),
  }),
  status: bookingStatusSchema.default('pending')
});

type StoreBookingResponse = z.infer<typeof storeBookingResponse>;

export const getBookingsV2 = asyncHandler(
  async (req: ICustomRequest<any>, res: TypedResponse<StoreBookingResponse[]>) => {
    try {
      const storeId = req.store?._id;
      //TODO
      const slots = await TimeSlot.find({ storeId }, { _id: 1 });
      const tempBookings = await Booking.aggregate([
        {
          $match: {
            timeSlotId: { $in: slots.map((e) => e._id) }
          },

        },
        {
          $lookup: {
            from: 'users',
            localField: "userId",
            foreignField: '_id',
            as: 'customer'
          }
        },
        {
          $unwind: {
            path: "$customer",
            preserveNullAndEmptyArrays: true
          },
        },
        {
          $lookup: {
            from: 'timeslots',
            localField: "timeSlotId",
            foreignField: '_id',
            as: 'timeslot'
          }
        },
        {
          $unwind: {
            path: "$timeslot",
            preserveNullAndEmptyArrays: true
          },
        },
        {
          $project: {
            _id: 1,
            isActive: 1,
            'customer.fullName': 1,
            'customer.phone': 1,
            'timeslot.startTime': 1,
            'timeslot.endTime': 1,
            status: 1,
          }
        }
      ]);
      let bookings: StoreBookingResponse[] = [];
      for (const item of tempBookings) {
        const k = safeRuntimeValidation(storeBookingResponse, item);
        if (k.error) {
          //TODO: correct on production.
          res.status(500).json(k.error);
          return;
          // continue;
        }
        bookings.push(k.data);
      }

      res.status(200).json(bookings.reverse());
    } catch (error) {
      onCatchError(error, res);
    }
  }
)

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
    //TODO: extract zod object.
    const { proId } = z.object({ proId: ObjectIdSchema }).parse(req.body);

    const product = await Product.findById(proId);
    if (!product)
      return res.status(404).json({ message: "Product not found." });

    product.stock = !product.stock;

    await product.save();
    res.status(200).json({ message: "Stock updated successfully." });
  } catch (error) {
    onCatchError(error, res);
  }
};

export const updateFcmToken = asyncHandler(
  async (req: ICustomRequest<any>, res: Response) => {
    const storeId = req.store?._id;
    try {
      if (storeId) {
        await Store.findByIdAndUpdate(storeId, { fcmToken: req.body.fcmToken });
      }
      res.status(200).json({ message: "Token updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error", error });
    }
  }
)

export const addKeyWords = asyncHandler(
    async (req: ICustomRequest<any>, res: TypedResponse<undefined>) => {
      const storeId = req.store?._id;
      if (!storeId) {
        res.status(400).json({message: "Store id is required"});
        return;
      }
      try {
        const keyWords = z.object({keyWords: z.string()}).parse(req.body).keyWords;

        const store = await Store.findByIdAndUpdate(storeId, {keyWords});
        if (!store) {
          res.status(404).json({message: "Store not found"});
          return;
        }
        res.status(200).json({message: "key words added successfully"});
      } catch (error) {
        onCatchError(error, res);
      }
    }
)

//TODO: may not need validate response here.
export const createAndSaveStore = async (rawBody: IReusableCreateStoreSchema) : Promise<{ dbStore: IStore, validatedData: ZStore}> => {
  const data = reusableCreateStoreSchema.parse(rawBody);

  const { shopImgUrl, latitude, longitude, plainPassword, phone, uniqueName, email, ...rest } = data;

  const existingStore = await getStoreByPhoneOrUniqueNameOrEmail(phone, uniqueName, email);
  if (existingStore) {
    const message = existingStore.phone === phone ? "Phone number already exists" : "Unique name already exists";
    throw new AppError( message, 209);
  }

  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  const location = {
    type: "Point",
    coordinates: [latitude, longitude],
  };

  const subscriptionExpireDate = new Date();
  subscriptionExpireDate.setFullYear(subscriptionExpireDate.getFullYear() + 1);

  const storeDetails = {
    uniqueName,
    phone,
    password: hashedPassword,
    shopImgUrl,
    email,
    location,
    subscriptionExpireDate,
    ...rest,
  };

  const newStore = new Store(storeDetails);
  const savedStore = await newStore.save();

  if (rest.serviceTypeSuggestion) {
    try {
      await new FeedBack({
        storeId: savedStore._id,
        ourQuestion: "Describe your service for store",
        answer: rest.serviceTypeSuggestion
      }).save();
    } catch (e) {
      console.error("Error saving feedback during store creation:", e);
    }
  }

  const validatedData = runtimeValidation<ZStore>(savedStoreResponseSchema as any, {
    ...savedStore.toObject(),
    categories: savedStore.categories.map(e => e.toString()),
    category: savedStore.category?.toString(),
    subCategories: savedStore.subCategories?.map(e => e.toString()),
  } as any)
  return {
    dbStore: savedStore,
    validatedData,
  };
};


export const updateStore =
    async ({
             storeId,
             updateData,
           }: {
      storeId: string;
      updateData: unknown;
    }): Promise<ZStore> => {
  if (!storeId) {
    throw new AppError("storeId is required", 400);
  }

  let parsedFields: any = updateProfileSchema
      .parse(updateData);

  if (parsedFields.plainPassword) {
    parsedFields.password = await bcrypt.hash(parsedFields.plainPassword, 10);
    delete parsedFields.plainPassword;
  }

  const existingStore = await Store.findById(storeId);
  if (!existingStore) {
    throw new AppError("Store not found", 400);
  }

  const updatedStore = await Store.findByIdAndUpdate(storeId, parsedFields, {
    new: true,
  });

  if (!updatedStore) {
    throw new AppError("Failed to update store", 500);
  }

  return runtimeValidation<ZStore>(savedStoreResponseSchema as any, {
    ...updatedStore.toObject(),
    categories: updatedStore.categories.map(e => e.toString()),
    category: updatedStore.category?.toString(),
    subCategories: updatedStore.subCategories?.map(e => e.toString()),
  } as any);
};

