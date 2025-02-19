import asyncHandler from "express-async-handler";
import { Request, Response, Router } from "express";
import ProductSearch from "../models/productSearch";
import Product from "../models/productModel";
import Category from "../models/categoryModel";
import Store from "../models/storeModel";

const router = Router();

const searchProductsAndStores = asyncHandler(
    async (req: any, res: any) => {
        try {
            const searchTerm = req.query.searchTerm;
            const { latitude, longitude } = req.query;

            if (!latitude || !longitude) {
                return res.status(400).json({ message: "latitude, longitude fields are required" });
            }

            if (!searchTerm) {
                return res.status(400).json({ message: "Search term is required" });
            }

            // Save search term in ProductSearch collection
            const trimmedSearchTerm = searchTerm.toString().trim();
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

            // Search products
            const products = await Product.aggregate([
                {
                    $geoNear: {
                        near: { type: "Point", coordinates: [parseFloat(latitude), parseFloat(longitude)] }, // Replace with actual user coordinates
                        distanceField: "distance", // Field to store the calculated distance
                        spherical: true, // Use spherical geometry for Earth-like calculations
                    },
                },
                {
                    $match: {
                        name: { $regex: trimmedSearchTerm, $options: "i" }, // Apply name filter
                    },
                },
                {
                    $lookup: {
                        from: "stores", // Reference to the 'stores' collection
                        localField: "store",
                        foreignField: "_id",
                        as: "store",
                    },
                },
                {
                    $unwind: "$store", // Convert store array into an object (if necessary)
                },
                {
                    $project: {
                        name: 1,
                        images: 1,
                        description: 1,
                        price: 1,
                        offerPrice: 1, category: 1,
                        stock: 1,
                        addToCartActive: 1,
                        isEnquiryAvailable: 1,
                        store: { storeName: 1, uniqueName: 1, location: 1, _id: 1 }, // Keep only necessary fields
                        distance: { $toString: "$distance" },
                    },
                },
            ]);

            // Search stores by name, bio, and category
            const categories = await Category.find({
                name: { $regex: trimmedSearchTerm, $options: "i" }
            });
            const filteredProducts = products.filter(product => product.store); // Remove products with no store

            const categoryIds = categories.map(category => category._id);

            const stores = await Store.aggregate([
                {
                    $geoNear: {
                        near: { type: "Point", coordinates: [parseFloat(latitude), parseFloat(longitude)] },
                        distanceField: "distance",
                        spherical: true
                    }
                },
                {
                    $match: {
                        $or: [
                            { storeName: { $regex: trimmedSearchTerm, $options: "i" } },
                            { bio: { $regex: trimmedSearchTerm, $options: "i" } },
                            { category: { $in: categoryIds } }
                        ]
                    }
                },
                {
                    $lookup: {
                        from: "categories",
                        localField: "category",
                        foreignField: "_id",
                        as: "category"
                    }
                },
                {
                    $unwind: "$category"
                },
                {
                    $project: {
                        storeName: 1, bio: 1, address: 1, openTime: { $ifNull: ["$openTime", 0] }, closeTime: { $ifNull: ["$closeTime", 0] },
                        isDeliveryAvailable: { $ifNull: ["$isDeliveryAvailable", false] }, instagram: 1, facebook: 1, whatsapp: 1,
                        phone: 1, shopImgUrl: 1, service: { $ifNull: ["$service", false] }, location: 1, city: 1,
                        distance: { $toString: "$distance" },
                        category: "$category.name"
                    }
                }
            ]);

            res.status(200).json({
                products: filteredProducts,
                stores,
                total: filteredProducts.length + stores.length,
            });
        } catch (error) {
            console.error("Error in combined search:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    }
);

router.route('/').get(searchProductsAndStores);

export { router as searchRouter };