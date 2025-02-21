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
import { store } from "../../middleware/auth";

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
    var { isPending, ...rest } = req.body;
    if (rest.store == undefined ) {
      rest.store = req.store?._id ?? req.params.storeId;
    }
    //TODO need to remove.
      if(rest.category == undefined || rest.category == null || rest.category.length == 0) {
        console.log("category" ,rest.category);
      rest.category = "668c25b3deec29b038e1fc25";
    }
    if (req.store == undefined && isPending) { // through bussiness app, we would only choose available category, so no need for isPending, authToken passing from mobile side
      let storeId = req.params.storeId;
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
//TODO: correct on the flutter app.
    if (rest.offerPrice == null) {
      rest.offerPrice = 0;
    }
    

    const product = new Product({
      isPending,
      store,
      ...rest,
    });

    var newProduct = await (await product.save()).populate("category");    
    res.status(201).json(newProduct);
  }
);

// update product
export const updateProduct = asyncHandler(
  async (req: Request, res: Response) => {
    let productId;
    if (req.query.productId) {
      productId = req.query.productId;
    } else {
      productId = req.params.productId;
    }
    const product = await Product.findByIdAndUpdate(
      productId,
      req.body
    );

    if (product) {
      res.status(200).json({ message: "Product has been updated", product: product});
    } else {
      res.status(400).json({ message: "Product not found"});
      throw new Error("Products not found!");
    }
  }
);

// delete product
//TODO: check duplication, make sure front end not depend on this.
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

export const switchStockStatusOfAProduct = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      await Product.findById(req.query.productId, {
        stock: req.query.stockStatus
      });
      res.status(200).json({ message: "Stock status changed successfully" });
    } catch (error) {
      console.log("error at switchStock", error);
      res.status(500).json({ message: "Internal server error" });
    }
  })

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
  async (req: ICustomRequest<undefined>, res: Response) => {
    let storeId;
    if (req.store?._id ) {
      storeId = req.store._id;
    } else {
      storeId = req.params.storeId;
    }
    const products = await Product.find({ store: storeId }).populate(
      "category"
    );

    res.status(200).json(products);
  }
);

//delete product of a store
export const deleteProductOfAStore = asyncHandler(
  async (req: any, res: Response) => {
    let productId;
    if (req.query.productId) {
      productId = req.query.productId;
    } else {
      productId = req.params.storeId; //from mobile side it will pass as productId, from web it will be storeId (by previous developer - anurak MK)
      //TODO: change in the front end storeId -> productId, then change here.
    }
    try {
      const result = await Product.findByIdAndDelete(productId);
      res.status(200).json(result);
    } catch (error) {
      console.log("error at deleteProductOfAStore", error);
      res.status(200).json({ message: "Internal server error" });
    }

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

export const fetchProductsV2 = asyncHandler(async (req: any, res: Response) => {
  try {
    const {
      category,
      sort,
      searchTerm,
      storeId,
      page = 1,
      limit = 12,
    } = req.query;
    console.log("on getch v2");
    

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

    console.log(await Product.find({ store: storeId}));
    

    const tProducts = await Product.find(filter).populate("store", "storeName uniqueName location")
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));
    const products = tProducts.filter((e) => e.store);

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


export const getNearbyProductsWithOffer = asyncHandler(
  async (req: any, res: any) => {
    try {
      const { longitude, latitude } = req.query;
      if (!longitude || !latitude) {
        return res.status(400).json({ message: "Longitude and latitude are required" });
      }

      // First find nearby stores
      const nearbyStores = await Store.aggregate([
        {
          
            $geoNear: {
              near: {
                type: "Point",
                coordinates: [parseFloat(longitude), parseFloat(latitude)]
              },
              distanceField: "distance",
              spherical: true
            },
          
        },
        {
          $match: {
            isActive: true
          }
        },
        {
          $project: {
            _id: 1
          }
        }
      ]);

      // Get store IDs
      const storeIds = nearbyStores.map(store => store._id);

      // Find products from these stores that have offers
      const products = await Product.find({
        store: { $in: storeIds },
        offerPrice: { $exists: true, $gt: 0 },
        isActive: true,
        isAvailable: true
      }).populate('store', 'storeName location');

      res.status(200).json(products);
    } catch (error) {
      res.status(500).json({ message: "Internal server error", error });
    }
  }
);

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

          // await s3
          //   .putObject({
          //     Body: fileContent,
          //     Bucket: config.s3BucketName,
          //     Key: uniqueFileName,
          //     ContentType: mimetype,
          //   })
          //   .promise();

          return uniqueFileName;
        }
      }
    );

    const uploadedUrls = await Promise.all(uploadPromises);

    res.status(200).json({ urls: uploadedUrls });
  }
);
