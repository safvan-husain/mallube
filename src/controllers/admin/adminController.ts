import { NextFunction, Request, Response, response } from "express";
import asyncHandler from "express-async-handler";
import bcrypt from "bcryptjs";
import Admin from "../../models/adminModel";
import Staff from "../../models/staffModel";
import Store from "../../models/storeModel";
import mongoose from "mongoose";
import Advertisement from "../../models/advertisementModel";

export const login = asyncHandler(async (req: Request, res: Response) => {
  console.log("admin")
  try {
    const { name, email, password } = req.body;
    const user = await Admin.findOne({ email });
    if (user) {
      const match = await bcrypt.compare(password, user.password);
      if (match) {
        const token = user.generateAuthToken(user._id);
        res.status(200).json({
          _id: user._id,
          name: user.name,
          email: user.email,
          token: token,
        });
      } else {
        res.status(500).json({ message: "Email or password wrong!" });
      }
    } else {
      res.status(500).json({ message: "Email not exist" });
    }
  } catch (error) {
    console.log("Error in admin login", error);
  }
});

export const addStaff = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { name, email, password } = req.body;
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
        password, // Remember to hash the password before saving it in the database
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
    const {subscription, storeId} = req.body;
    const store = await Store.findOne({ _id: storeId });
    if (!store) {
      return res.status(404).json({ message: "Store not found" });
    }

    store.subscriptionPlan = subscription

    if (store.subscriptionPlan !== "noPlanTaken") {
      store.subscriptionActivatedAt = new Date();
      const expirationDate = new Date();
      expirationDate.setFullYear(expirationDate.getFullYear() + 1);
      store.subscriptionExpiresAt = expirationDate;
    } else {
      store.subscriptionActivatedAt = undefined;
      store.subscriptionExpiresAt = undefined;
    }

    await store.save();
    res
      .status(200)
      .json({ message: "Subscription status updated successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({message:"Internal server error"})
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
    console.log("STaffidf ",staffId)
    const staffMember = await Staff.findById(staffId);

    if (!staffMember) {
      return res.status(404).json({ message: "Staf not found" });
    }
    staffMember.target = target;
    staffMember.save()
    res.status(200).json({ message: "Target added successfullly" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};
