import { NextFunction, Request, Response, response } from "express";
import asyncHandler from "express-async-handler";
import bcrypt from "bcryptjs";
import Admin from "../../models/adminModel";
import Staff from "../../models/staffModel";
import Store from "../../models/storeModel";
import mongoose from "mongoose";
import Advertisement from "../../models/advertisementModel";
import ProductSearch from "../../models/productSearch";
import User from "../../models/userModel";
import { getNextYearSameDateMinusOneDay } from "../../utils/misc";
import Product from "../../models/productModel";
import Category from "../../models/categoryModel";

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user: any = await Admin.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Please check your email" });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res
        .status(400)
        .json({ message: "Invalid password", login: false });
    }
    const token = user.generateAuthToken(user._id);
    const stores = await Store.updateMany({}, {
      $addFields: {
        visitors: [],
        live: 'open'
      }
    });
    
    const products = await Product.updateMany({}, {
      $addFields: {
        addToCartActive: true
      }
    });
    
    const categories = await Category.updateMany({}, {
      $addFields: {
        isDeclined: false
      }
    });
    
    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: token,
    });
  } catch (error) {
    console.log("Error in admin login", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const addStaff = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { name, email, password, phone } = req.body;
    try {
      // Check if staff member already exists
      const existingStaff = await Staff.findOne({ email });
      if (existingStaff) {
        res.status(400).json({ message: "Staff already registered" });
      }

      // Create a new staff member
      const newStaff = new Staff({
        name,
        email,
        password,
        phone,
        // Remember to hash the password before saving it in the database
        // status: 'active', // Set the default status if needed
        // addedStore: [] // Initialize the addedStore array if needed
      });

      // Save the new staff member to the database
      await newStaff.save();

      // Return a success message
      res.status(201).json({ message: "Staff added successfully" });
    } catch (error) {
      console.log("erers ", error);
    }
  }
);

export const fetchStaffs = asyncHandler(async (req: Request, res: Response) => {
  try {
    const staffs = await Staff.find();
    res.status(200).json(staffs);
  } catch (error) {
    console.log(error);
  }
});

export const updateStaff = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { name, email, status } = req.body;

    const staff = await Staff.findOneAndUpdate(
      { email },
      { name, status }, // Update only the name and status fields
      { new: true } // Return the updated document
    );

    if (staff) {
      res.status(200).json(staff);
    } else {
      res.status(404).json({ message: "Staff not found" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export const deleteStaff = asyncHandler(async (req: Request, res: Response) => {
  try {
    const staffId = req.params.staffId;

    const staff = await Staff.findByIdAndDelete(staffId);

    if (!staff) {
      res.status(404).json({ message: "Staff not found" });
      return;
    }

    res.status(200).json({ message: "Staff deleted successfully" });
  } catch (error) {
    console.error("Error deleting staff:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export const fetchAllStore = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const stores = await Store.aggregate([
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
  }
);

export const updateSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { subscription, storeId } = req.body;
    const store = await Store.findOne({ _id: storeId });
    if (!store) {
      return res.status(404).json({ message: "Store not found" });
    }

    store.subscription.plan = subscription;

    store.subscription.activatedAt = new Date();
    store.subscription.expiresAt = getNextYearSameDateMinusOneDay();

    await store.save();
    res
      .status(200)
      .json({ message: "Subscription status updated successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
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
    const updatedStore = await Store.findByIdAndUpdate(storeId, updatedFields, {
      new: true,
      runValidators: true,
    });
    res
      .status(200)
      .json({ message: "Store updated successfully", store: updatedStore });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "internal server error", error });
  }
};
export const getAdminStore = asyncHandler(
  async (req: Request, res: Response) => {
    const id = req.params.storeId;

    const store = await Store.findOne({ _id: id})
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
      return res.status(400).json({ message: "Password mismatch!`" });
    }
    if (!mongoose.Types.ObjectId.isValid(user)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const userData: any = await Admin.findById(user);
    if (!userData) {
      return res.status(404).json({ message: "User not found" });
    }

    const match = await bcrypt.compare(password, userData.password);
    if (match) {
      const hashPassword = await bcrypt.hash(reEnterPassword, 10);

      const response = await Admin.findByIdAndUpdate(
        user,
        {
          password: hashPassword,
        },
        { new: true }
      );

      return res.status(200).json({ message: "Password updated successfully" });
    } else {
      return res.status(400).json({ message: "Current password is incorrect" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const addAdvertisement = async (req: Request, res: Response) => {
  try {
    const { image, isMainAdvertisement, isSecondAdvertisement } = req.body;

    const newAdvertisement = new Advertisement({
      image,
      isMainAdvertisement,
      isSecondAdvertisement,
    });
    await newAdvertisement.save();
    res.status(201).json({ message: "Advertisement added successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const fetchAllAdvertisement = async (req: Request, res: Response) => {
  try {
    const advertisements = await Advertisement.find();
    res.status(200).json(advertisements);
  } catch (error) {
    console.log(error);
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

export const updateAdvertisementDisplay = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const { advertisement, advertisementId } = req.body;

      const updatedAdvertisement = await Advertisement.findByIdAndUpdate(
        advertisementId,
        {
          advertisementDisplayStatus: advertisement,
        },
        {
          new: true,
        }
      );

      if (!updatedAdvertisement) {
        res.status(404).json({ message: "Advertisement not found" });
      }
      res.status(200).json({
        message: "Advertisement display status updated successfully",
        updatedAdvertisement,
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

export const fetchTotalStoreByCategory = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const storeCount = await Store.aggregate([
        {
          $group: {
            _id: "$category",
            count: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: "categories",
            localField: "_id",
            foreignField: "_id",
            as: "category",
          },
        },
        {
          $unwind: "$category",
        },
        {
          $project: {
            _id: 0,
            category: "$category.name",
            count: 1,
          },
        },
      ]);

      res.status(200).json(storeCount);
    } catch (error) {
      console.log(error);
    }
  }
);

export const addTarget = async (req: any, res: Response) => {
  try {
    const { target, staffId } = req.body;
    console.log("STaffidf ", staffId);
    const staffMember = await Staff.findById(staffId);

    if (!staffMember) {
      return res.status(404).json({ message: "Staf not found" });
    }
    staffMember.target = target;
    staffMember.save();
    res.status(200).json({ message: "Target added successfullly" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const mostSearchedProducts = async (req: Request, res: Response) => {
  try {
    const response = await ProductSearch.aggregate([
      { $sort: { searchCount: -1 } },
      { $limit: 10 },
    ]);
    if (!response || response.length === 0) {
      res.status(404).json({ message: "No Search history." });
    }
    res.status(200).json(response);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteStoreById = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const storeId = req.params.storeId;

      const store = await Store.findByIdAndDelete(storeId);

      if (!store) {
        res.status(404).json({ message: "store not found" });
        return;
      }

      res.status(200).json({ message: "store deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
);

export const fetchAllUsers = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { page = 1, limit = 12, search = "" } = req.query;

    const startIndex = (Number(page) - 1) * Number(limit);

    const searchQuery: any = {
      $or: [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ],
    };

    const total = await User.countDocuments({});

    const users = await User.find(searchQuery)
      .limit(Number(limit))
      .skip(startIndex);

    res.status(200).json({
      users,
      total,
    });
  }
);

export const updateUserStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { userId } = req.body;
  try {
    if (userId == null) {
      res.status(400).json({ message: "User id is required" });
      return;
    }

    const user: any = await User.findById(userId);

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const updateUser: any = await User.findByIdAndUpdate(
      userId,
      { $set: { isBlocked: !user.isBlocked } },
      { new: true }
    );

    res.status(200).json({
      message: `User ${
        updateUser?.isBlocked ? "Blocked" : "Unblocked"
      } successfully`,
      updateUser,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Something went wrong , please try again later" });
  }
};

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.params.userId;

  const store = await User.findByIdAndDelete(userId);

  if (!store) {
    res.status(404).json({ message: "store not found" });
    return;
  }

  res.status(200).json({ message: "store deleted successfully" });
});

export const fetchUsersCount = async (req: Request, res: Response) => {
  try {
    const usersCount = await User.countDocuments();
    if (!usersCount) {
      return res.status(404).json({ message: "No users" });
    }

    res.status(200).json(usersCount);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};


export const fetchAdminDetails = async (req:Request,res:Response)=>{
  try {
    const adminId = req.user?._id
    
    if(!adminId){
      return res.status(401).json({message:"Not authorized"})
    }

    const admin = await Admin.findById(adminId)
    if(!admin){
      return res.status(404).json({message:"Not found"})
    }
    res.status(200).json(admin)
  } catch (error) {
    console.log("error ",error)
    res.status(500).json({ message: "Internal server error" });
  }
}