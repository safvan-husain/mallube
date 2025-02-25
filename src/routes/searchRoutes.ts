import asyncHandler from "express-async-handler";
import { Request, Response, Router } from "express";
import ProductSearch from "../models/productSearch";
import Product from "../models/productModel";
import Category from "../models/categoryModel";
import Store from "../models/storeModel";
// import { searchStoresByProductNameV2 } from "../controllers/store/storeController";

const router = Router();

const searchStoresByProductNameV2 = asyncHandler(
    async (req: Request, res: Response) => {
        try {
            let productName: any = req.query.searchTerm;
            const { latitude, longitude, lastId, limit, lastDistance } = req.query;

            if (!productName) {
                res.status(400).json({ message: "Product name is required" });
            }

            if (!latitude || !longitude) {
                res.status(400).json({ message: "Latitude and longitude are required" });
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



            const trimmedSearchTerm = productName.trim();

            const categories = await Category.find({
                name: { $regex: trimmedSearchTerm, $options: "i" }
            })

            const categoryIds = categories.map((category) => category._id);

            // Find products that match the search term and get the store ids
            const productss = await Product.aggregate([
                {
                    $geoNear: {
                        near: { type: "Point", coordinates: [parseFloat(latitude as string), parseFloat(longitude as string)] }, // Your target coordinates
                        distanceField: "distance", // Adds a field with the distance
                        spherical: true, // Required for GeoJSON points
                    }
                },
                {
                    $match: {
                        name: { $regex: trimmedSearchTerm, $options: "i" }, // Search product name
                    }
                }
            ]);
            const productStoreIds = productss.map((product) => product.store);

            const pipeline: any[] = [];
            pipeline.push({
                $geoNear: {
                    near: {
                        type: "Point",
                        coordinates: [
                            parseFloat(latitude as string),
                            parseFloat(longitude as string),
                        ],
                    },
                    distanceField: "distance",
                    // spherical: true,
                },
            });

            pipeline.push({
                $match: {
                    $or: [
                        { storeName: { $regex: trimmedSearchTerm, $options: "i" } },
                        { bio: { $regex: trimmedSearchTerm, $options: "i" } },
                        { category: { $in: categoryIds } },
                        { _id: { $in: productStoreIds } },
                    ],
                },
            });

            // Pagination filter based on distance and _id
            if (lastDistance && lastId && limit) {
                pipeline.push(
                    {
                        $match: {
                            $or: [
                                { distance: { $gt: parseFloat(lastDistance as string) } },
                                { distance: parseFloat(lastDistance as string), _id: { $gt: lastId } }
                            ]
                        }
                    },
                    { $sort: { distance: 1, _id: 1 } },
                );
            }

            if (limit) {
                pipeline.push({ $limit: parseInt(limit as string) });
            }



            const stores = await Store.aggregate([
                ...pipeline,
                {
                    $lookup: {
                        from: "categories", // Collection name for categories
                        localField: "category",
                        foreignField: "_id",
                        as: "categoryDetails",
                    },
                },
                {
                    $unwind: "$categoryDetails",
                },
                {
                    $project: {
                        storeName: { $ifNull: ["$storeName", "Unnamed Store"] },
                        bio: { $ifNull: ["$bio", ""] },
                        address: { $ifNull: ["$address", "No address provided"] },
                        openTime: { $ifNull: ["$openTime", 0] }, // Example default
                        closeTime: { $ifNull: ["$closeTime", 0] }, // Example default
                        isDeliveryAvailable: { $ifNull: ["$isDeliveryAvailable", false] },
                        instagram: { $ifNull: ["$instagram", ""] },
                        facebook: { $ifNull: ["$facebook", ""] },
                        whatsapp: { $ifNull: ["$whatsapp", ""] },
                        phone: { $ifNull: ["$phone", ""] },
                        shopImgUrl: { $ifNull: ["$shopImgUrl", ""] },
                        service: { $ifNull: ["$service", false] },
                        location: 1,
                        city: { $ifNull: ["$city", "Unknown City"] },
                        distance: {
                            $toString: {
                                $round: ["$distance", 2],
                            },
                        },
                        category: "$categoryDetails.name",
                    },
                },
            ]);

            res.status(200).json(stores);
        } catch (error) {
            console.log(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }
);

router.route('/').get(searchStoresByProductNameV2);

export { router as searchRouter };