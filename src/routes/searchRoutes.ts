import asyncHandler from "express-async-handler";
import {Request, Response, Router} from "express";
import ProductSearch from "../models/productSearch";
import Product from "../models/productModel";
import Category from "../models/categoryModel";
import Store from "../models/storeModel";
import {BusinessAccountType} from "../controllers/store/validation/store_validation";

const router = Router();

const searchStoresByProductNameV2 = asyncHandler(
    async (req: Request, res: Response) => {
        try {
            const type: BusinessAccountType = req.path.includes('/freelance') ? 'freelancer' : 'business';
            let productName: any = req.query.searchTerm;
            let { latitude, longitude, limit, skip } = req.query;

            if (!limit) {
                limit = '30';
            }

            if (!skip) {
                skip = '0';
            }

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
            const regex  = { $regex: trimmedSearchTerm, $options: "i" };

            const categories = await Category.find({
                name: regex
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
                        name: regex, // Search product name
                    }
                }
            ]);
            const productStoreIds = productss.map((product) => product.store);

            const pipeline: any[] = [];
            pipeline.push({
                $match: {
                    //type check for either freelancer or store.
                    type,
                    $or: [
                        { storeName: regex },
                        { keyWords: regex },
                        { bio: regex },
                        { category: { $in: categoryIds } },
                        { _id: { $in: productStoreIds } },
                    ],
                },
            });

            pipeline.push({
                $addFields: {
                    distance: {
                        $function: {
                            //calculating distance between two points (userLocation, advertisementLocation)
                            //then checking that distance is less than or equal to radius ( checking whether user is in the area of advertisement)
                            body: function (
                                location: { coordinates: Array<number> } | undefined | null, lat1: number, lon1: number,
                            ): number | null {
                                if (location === null || location === undefined) {
                                    return null;
                                }
                                const [lat2, lon2] = location!.coordinates;
                                const r = 6371; // Radius of the Earth in kilometers
                                const p = Math.PI / 180; // Convert degrees to radians

                                const dLat = (lat2 - lat1) * p;
                                const dLon = (lon2 - lon1) * p;
                                const lat1Rad = lat1 * p;
                                const lat2Rad = lat2 * p;

                                const a =
                                    0.5 - Math.cos(dLat) / 2 +
                                    Math.cos(lat1Rad) * Math.cos(lat2Rad) *
                                    (1 - Math.cos(dLon)) / 2;

                                const distanceInMeters = 2 * r * Math.asin(Math.sqrt(a)); // Convert to meters
                                return distanceInMeters * 1.60934; //distance in km.
                            },
                            args: ["$location", latitude, longitude],
                            lang: "js"

                        }
                    }
                }
            });

            const stores = await Store.aggregate([
                ...pipeline,
                { $sort: { distance: 1, _id: 1 } },
                { $skip: parseInt(skip as string) },
                { $limit: parseInt(limit as string) },
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
                        distance: 1,
                        category: "$categoryDetails.name",
                    },
                },
            ]);

            // res.status(200).json(stores);
            res.status(200).json(stores.map(e => ({ ...e, distance: (e.distance as number).toFixed(2) })));
        } catch (error) {
            console.log(error);
            res.status(500).json({ message: "Internal server error", error });
        }
    }
);

// const searchFreelancerByProductNameV2 = asyncHandler(
//     async (req: Request, res: Response) => {
//         try {
//             let productName: any = req.query.searchTerm;
//             var { latitude, longitude, limit, skip } = req.query;
//
//             if (!limit) {
//                 limit = '30';
//             }
//
//             if (!skip) {
//                 skip = '0';
//             }
//
//             if (!productName) {
//                 res.status(400).json({ message: "Product name is required" });
//             }
//
//             if (!latitude || !longitude) {
//                 res.status(400).json({ message: "Latitude and longitude are required" });
//             }
//
//             if (productName) {
//                 const trimmedSearchTerm = productName.trim();
//                 const productSearch = await ProductSearch.findOne({
//                     productName: trimmedSearchTerm,
//                 });
//                 if (productSearch) {
//                     await ProductSearch.findOneAndUpdate(
//                         { productName: trimmedSearchTerm },
//                         { $inc: { searchCount: 1 } }
//                     );
//                 } else {
//                     await ProductSearch.create({
//                         productName: trimmedSearchTerm,
//                         searchCount: 1,
//                     });
//                 }
//             }
//
//             //ensure product name is a string
//             productName =
//                 typeof productName === "string"
//                     ? decodeURIComponent(productName).trim()
//                     : "";
//
//
//
//             const trimmedSearchTerm = productName.trim();
//
//             const categories = await Category.find({
//                 name: { $regex: trimmedSearchTerm, $options: "i" },
//                 isEnabledForIndividual: true,
//             })
//
//             const categoryIds = categories.map((category) => category._id);
//
//             // Find products that match the search term and get the store ids
//             const productss = await Product.aggregate([
//                 {
//                     $geoNear: {
//                         near: { type: "Point", coordinates: [parseFloat(latitude as string), parseFloat(longitude as string)] }, // Your target coordinates
//                         distanceField: "distance", // Adds a field with the distance
//                         spherical: true, // Required for GeoJSON points
//                     }
//                 },
//                 {
//                     $match: {
//                         individual: { $exists: true },
//                         name: { $regex: trimmedSearchTerm, $options: "i" }, // Search product name
//                     }
//                 },
//                 {
//                     $project: {
//                         individual: 1,
//                     }
//                 }
//             ]);
//             const productOwnerIds = productss.map((product) => product.individual);
//
//             const pipeline: any[] = [];
//             pipeline.push({
//                 $match: {
//                     $or: [
//                         { name: { $regex: trimmedSearchTerm, $options: "i" } },
//                         { bio: { $regex: trimmedSearchTerm, $options: "i" } },
//                         { category: { $in: categoryIds } },
//                         { _id: { $in: productOwnerIds } },
//                     ],
//                 },
//             });
//
//             pipeline.push({
//                 $addFields: {
//                     distance: {
//                         $function: {
//                             //calculating distance between two points (userLocation, advertisementLocation)
//                             //then checking that distance is less than or equal to radius ( checking whether user is in the area of advertisement)
//                             body: function (
//                                 location: { coordinates: Array<number> } | undefined | null, lat1: number, lon1: number,
//                             ): number | null {
//                                 if (location === null || location === undefined) {
//                                     return null;
//                                 }
//                                 const [lat2, lon2] = location!.coordinates;
//                                 const r = 6371; // Radius of the Earth in kilometers
//                                 const p = Math.PI / 180; // Convert degrees to radians
//
//                                 const dLat = (lat2 - lat1) * p;
//                                 const dLon = (lon2 - lon1) * p;
//                                 const lat1Rad = lat1 * p;
//                                 const lat2Rad = lat2 * p;
//
//                                 const a =
//                                     0.5 - Math.cos(dLat) / 2 +
//                                     Math.cos(lat1Rad) * Math.cos(lat2Rad) *
//                                     (1 - Math.cos(dLon)) / 2;
//
//                                 const distance = 2 * r * Math.asin(Math.sqrt(a));
//                                 const distanceInMeters = distance; // Convert to meters
//                                 const distanceInKM = distanceInMeters * 1.60934
//                                 return distanceInKM;
//                             },
//                             args: ["$location", latitude, longitude],
//                             lang: "js"
//
//                         }
//                     }
//                 }
//             });
//
//             const stores = await Freelancer.aggregate([
//                 ...pipeline,
//                 { $sort: { distance: 1, _id: 1 } },
//                 { $skip: parseInt(skip as string) },
//                 { $limit: parseInt(limit as string) },
//                 {
//                     $lookup: {
//                         from: "categories", // Collection name for categories
//                         localField: "categories",
//                         foreignField: "_id",
//                         as: "categoryDetails",
//                     },
//                 },
//                 {
//                     $project: {
//                         name: { $ifNull: ["$name", "Unnamed Store"] },
//                         // bio: { $ifNull: ["$bio", ""] },
//                         // address: { $ifNull: ["$address", "No address provided"] },
//                         "address": {
//                             "$concat": [
//                                 { "$ifNull": ["$city", "Unknown City"] },
//                                 ", ",
//                                 { "$ifNull": ["$district", "Unknown District"] },
//                             ]
//                         },
//                         // openTime: { $ifNull: ["$openTime", 0] }, // Example default
//                         // closeTime: { $ifNull: ["$closeTime", 0] }, // Example default
//                         // instagramUrl: { $ifNull: ["$instagramUrl", ""] },
//                         // facebookUrl: { $ifNull: ["$facebookUrl", ""] },
//                         // whatsapp: { $ifNull: ["$whatsapp", ""] },
//                         phone: { $ifNull: ["$phone", ""] },
//                         icon: { $ifNull: ["$icon", ""] },
//                         // service: { $ifNull: ["$service", false] },
//                         // location: 1,
//                         // city: { $ifNull: ["$city", "Unknown City"] },
//                         distance: 1,
//                         categories: {
//                             $map: {
//                                 input: "$categoryDetails",
//                                 as: "cat",
//                                 in: {
//                                     _id: "$$cat._id",
//                                     name: "$$cat.name"
//                                 }
//                             }
//                         }
//                     },
//                 },
//             ]);
//
//             res.status(200).json(stores.map(e => ({ ...e, distance: (e.distance as number).toFixed(2) })));
//         } catch (error) {
//             console.log(error);
//             res.status(500).json({ message: "Internal server error", error });
//         }
//     }
// );

router.route('/').get(searchStoresByProductNameV2);
router.route('/freelance').get(searchStoresByProductNameV2);

export { router as searchRouter };