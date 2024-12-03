import { Request, Response } from "express";
import { UploadedFile } from "express-fileupload";
import asyncHandler from "express-async-handler";
import mongoose, { Types, Schema } from "mongoose";

import {
  IAddProductSchema,
  IUploadProdutImagesSchema,
} from "../../schemas/product.schema";

import { ICustomRequest } from "../../types/requestion";

import {
  isDuplicateCategory,
  listActiveSubCategories,
  listAllSubCategories,
} from "../../service/category";

import Product from "../../models/productModel";
import Category from "../../models/categoryModel";
import Store from "../../models/storeModel";
import ProductSearch from "../../models/productSearch";

import { s3 } from "../../config/s3";
import { config } from "../../config/vars";
import User from "../../models/userModel";

// get all products
export const getAllProducts = asyncHandler(
  async (req: Request, res: Response) => {
    const products = await Product.find({}).sort("-createdAt");

    if (products) {
      res.status(200).json(products);
    } else {
      res.status(500);
      throw new Error("Product not found");
    }
  }
);

// get subcategories of a main category by id for showing on product adding page
export const getAllSubCategories = asyncHandler(
  async (req: any, res: Response) => {
    const store = await Store.findOne(
      { _id: req.params.shopId },
      { category: 1 }
    );

    if (!store?.category) throw new Error("Invalid shop id");

    const mainCategory: string = store?.category.toString();

    const activeSubCategories = await listAllSubCategories(mainCategory);
    res.status(200).json(activeSubCategories);
  }
);

// adding products for a shop
export const addProduct = asyncHandler(
  async (
    req: ICustomRequest<IAddProductSchema>,
    res: Response
  ): Promise<any> => {
    const { isPending, ...rest } = req.body;
    if (isPending) {
      const storeId = req.params.storeId;
      const storeDetails = await Store.findById(storeId);
      if (!storeDetails) {
        return res.status(404).json({ message: "Store not found" });
      }

      const storeCategory: any = storeDetails.category; /* req.storeId */
      const isDuplicate = await isDuplicateCategory(
        rest.category,
        storeCategory
      );
      if (isDuplicate)
        return res
          .status(409)
          .json({ message: "Duplicate Category Requested" });
      const categoryId = await Category.create({
        name: rest.category,
        parentId: storeCategory,
        isActive: true,
        isPending: true,
        isShowOnHomePage: false,
      });
      rest.category = categoryId._id;
    }
    const store = req.params.storeId;

    const product = new Product({
      isPending,
      store,
      ...rest,
    });

    const newProduct = await product.save();
    res.status(201).json(newProduct);
  }
);

// update product
export const updateProduct = asyncHandler(
  async (req: Request, res: Response) => {
    const product = await Product.findByIdAndUpdate(
      req.params.productId,
      req.body
    );

    if (product) {
      res.status(200).json("Product has been updated");
    } else {
      res.status(400);
      throw new Error("Products not found!");
    }
  }
);

// delete product

export const deleteProduct = asyncHandler(
  async (req: Request, res: Response) => {
    const product = await Product.findById(req.params.id);

    if (product) {
      // await product.remove();
      res.status(200).json("Product has been deleted");
    } else {
      res.status(400);
      throw new Error("Product not found!");
    }
  }
);

// get single product
export const getProductById = asyncHandler(
  async (req: Request, res: Response) => {
    const product = await Product.findById(req.params.productId).populate(
      "category"
    );

    if (product) {
      res.status(200).json(product);
    } else {
      res.status(400);
      throw new Error("product not found!");
    }
  }
);

//get product of a store
export const getProductsOfAStore = asyncHandler(
  async (req: Request, res: Response) => {
    const products = await Product.find({ store: req.params.storeId }).populate(
      "category"
    );

    res.status(200).json(products);
  }
);

//delete product of a store
export const deleteProductOfAStore = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await Product.findByIdAndDelete(req.params.storeId);

    res.status(200).json(result);
  }
);

export const addVisitors = asyncHandler(async (req: Request, res: Response) => {
  const { userId, shopId } = req.params;

  const shop = await Store.findById(shopId).exec();
  const user = await User.findById(userId).exec();

  if (user && shop) {
    shop.visitors+=1
    shop.save()
     res.status(200).json({ message: "Visitor added successfully." });
  }

  res.status(404).json({ message: "Shop or user not found." });
});

export const fetchProducts = asyncHandler(async (req: any, res: Response) => {
  try {
    const {
      category,
      sort,
      searchTerm,
      storeId,
      page = 1,
      limit = 12,
    } = req.query;

    let filter: any = {};

    if (storeId) {
      filter["store"] = storeId;
    }
    if (category) {
      filter["category"] = category;
    }

    if (searchTerm && searchTerm.trim()) {
      const trimmedSearchTerm = searchTerm.trim();
      filter["name"] = { $regex: trimmedSearchTerm, $options: "i" };

      // Search product name using searchTerm, if not exist, also create collection for adding count.
      // Check if the searched product already exists in the ProductSearch collection
      // If it exists, increment searchCount; if not, add a new document.
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

    let sortOptions: any = {};

    if (sort === "newest") {
      sortOptions["createdAt"] = -1;
    } else if (sort === "lowToHigh") {
      sortOptions["price"] = 1;
    } else if (sort === "highToLow") {
      sortOptions["price"] = -1;
    }

    // Calculate the skip value for pagination
    const skip = (page - 1) * limit;

    const products = await Product.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    // Get the total count of products for pagination calculation
    const totalProducts = await Product.countDocuments(filter);

    // Calculate the total number of pages
    const totalPages = Math.ceil(totalProducts / limit);

    res.status(200).json({
      products,
      totalPages,
      currentPage: parseInt(page),
      totalProducts,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
});

export const uploadProductImages = asyncHandler(
  async (req: ICustomRequest<IUploadProdutImagesSchema>, res: Response) => {
    const maxProductImagesAllowedBasedOnSubscription = (req as any).store
      ?.subscription?.maxProductImages;
    let files: UploadedFile | UploadedFile[] = req.files ? req.files.files : [];

    if (!Array.isArray(files)) {
      files = [files]; // Normalize to an array
    }

    const imageUrlsAndNames = req.body.imageUrlsAndNames;
    if (imageUrlsAndNames > maxProductImagesAllowedBasedOnSubscription) {
      throw new Error(
        "added more images than allowed as per subscription plan"
      );
    }

    const uploadPromises = imageUrlsAndNames.map(
      async (image: { url: string; file: string }) => {
        if (image.url) {
          return image.url;
        } else {
          const imageFile = files.find((f) => f.name === image.file);
          if (!imageFile) throw new Error("some files are missing");
          const { name, mimetype, data } = imageFile;

          const fileContent = Buffer.isBuffer(data)
            ? data
            : Buffer.from(data, "utf8");

          const sanitizedFileName = name.replace(/\s+/g, "_");

          const uniqueFileName = `${Date.now()}_${Math.floor(
            Math.random() * 1000
          )}_${sanitizedFileName}`;

          await s3
            .putObject({
              Body: fileContent,
              Bucket: config.s3BucketName,
              Key: uniqueFileName,
              ContentType: mimetype,
            })
            .promise();

          return uniqueFileName;
        }
      }
    );

    const uploadedUrls = await Promise.all(uploadPromises);

    res.status(200).json({ urls: uploadedUrls });
  }
);
