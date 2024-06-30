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

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { phone, password } = req.body;

  const storeOwner = await Store.findOne({ phone });
  if (storeOwner) {
    console.log("password ", password);
    console.log("storeowner.password ", storeOwner.password);
    const match = await bcrypt.compare(password, storeOwner.password);
    console.log("match ", match);
    if (match) {
      const token = storeOwner.generateAuthToken(storeOwner._id);
      res.status(200).json({
        _id: storeOwner._id,
        name: storeOwner.storeOwnerName,
        email: storeOwner.email,
        token: token,
        status: "ok",
      });
    } else {
      res.status(500).json({ message: ":Phone or password wrong!" });
    }
  } else {
    res.status(500).json({ message: "Phone not exist" });
  }
});

export const fetchStore = asyncHandler(
  async (req: any, res: Response, next: NextFunction): Promise<void> => {
    const storeId: any = req?.store._id;
    try {
      const store = await Store.findOne({ _id: storeId }).populate({
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

export const updateLiveStatus = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  try {
    const storeId: string = req.store._id;
    const store = await Store.findById(storeId);

    if (!store) {
      return res.status(404).json({ message: "Store not found" });
    }
    store.live = req.body.storeLiveStatus;
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
    const { image } = req.body;

    const newAdvertisement = new Advertisement({
      image,
      store: storeId,
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
    const storeId = req.store;
    const advertisements = await Advertisement.find({ store: storeId });
    res.status(200).json(advertisements);
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
          $maxDistance: 5000, // in meters
        },
      },
    }).populate("category", "name icon");

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

export const fetchStoreById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // Destructure the id from req.params

    const store: any = await Store.findById(id).populate("category", "name"); // Correctly pass the id to findById method

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

export const fetchStoreByCategory = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const categoryId: any = req.query.categoryId;
      let response;

      if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
        response = await Store.find({ category: categoryId });
      } else {
        response = await Store.find();
      }

      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

export const searchStoresByProductName = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      let productName: any = req.query.searchTerm;
      console.log("req.query ", req.query);
      console.log("reqched back ", productName);

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

      const stores = await Store.find({ _id: { $in: storeIds } }).populate(
        "category",
        "name"
      );

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
