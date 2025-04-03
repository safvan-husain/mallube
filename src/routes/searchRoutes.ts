import asyncHandler from "express-async-handler";
import {Request, Response, Router} from "express";
import ProductSearch from "../models/productSearch";
import Product from "../models/productModel";
import Category from "../models/categoryModel";
import Store from "../models/storeModel";
import {BusinessAccountType} from "../controllers/store/validation/store_validation";
import {z} from "zod";
import {paginationSchema} from "../schemas/commom.schema";
import {locationQuerySchema} from "../schemas/localtion-schema";
import {TypedResponse} from "../types/requestion";
import {StoreDetailsResponse, StoreDetailsSchema} from "../controllers/user/userController";
import {PipelineStage} from "mongoose";
import {internalRunTimeResponseValidation, onCatchError} from "../controllers/service/serviceContoller";

const router = Router();

const searchStoresByProductNameV2 = asyncHandler(
    async (req: Request, res: TypedResponse<StoreDetailsResponse[]>) => {
        try {
            const type: BusinessAccountType = req.path.includes('/freelance') ? 'freelancer' : 'business';
            let {latitude, longitude, limit, skip, searchTerm: productName} = z.object({
                searchTerm: z.string()
            }).merge(paginationSchema).merge(locationQuerySchema).parse(req.query);

            const trimmedSearchTerm = productName.trim();
            const regex = {$regex: trimmedSearchTerm, $options: "i"};
            const productSearch = await ProductSearch.findOne({
                productName: regex,
            });

            if (productSearch) {
                await ProductSearch.findOneAndUpdate(
                    {productName: regex},
                    {$inc: {searchCount: 1}}
                );
            } else {
                await ProductSearch.create({
                    productName: trimmedSearchTerm,
                    searchCount: 1,
                });
            }


            const matchedCategoryIds = (await Category.find({
                name: regex
            }, {_id: 1}).lean()).map((category) => category._id);

            // Find products that match the search term and get the store ids
            const matchedProductIds = (await Product.aggregate([
                {
                    $geoNear: {
                        near: {type: "Point", coordinates: [latitude, longitude]}, // Your target coordinates
                        distanceField: "distance", // Adds a field with the distance
                        spherical: true, // Required for GeoJSON points
                        query: {
                            name: regex
                        }
                    }
                },
                {$match: { store: { $exists: true }}},
                {
                    $project: {
                        _id: 1,
                        store: 1
                    }
                }
            ])).map((product) => product.store);

            const pipeline: PipelineStage[] = [
                {
                    $geoNear: {
                        near: {type: "Point", coordinates: [latitude, longitude]}, // Note: MongoDB uses [longitude, latitude]
                        distanceField: "distance",
                        query: {
                            type,
                            $or: [
                                {storeName: regex},
                                {keyWords: regex},
                                {bio: regex},
                                {category: {$in: matchedCategoryIds}},
                                {_id: {$in: matchedProductIds}},
                            ]
                        },
                        spherical: true,
                        distanceMultiplier: 0.0001
                    }
                },
                {$sort: {distance: 1, _id: 1}},
                {$skip: skip},
                {$limit: limit},
            ];

            const stores = await Store.aggregate([
                ...pipeline,
                {
                    $lookup: {
                        from: "categories", // Collection name for categories
                        localField: "category",
                        foreignField: "_id",
                        as: "category",
                    },
                },
                {
                    $lookup: {
                        from: "categories", // Collection name for categories
                        localField: "categories",
                        foreignField: "_id",
                        as: "categories",
                    },
                },
                {
                    $unwind: {
                        path: "$category",
                        preserveNullAndEmptyArrays: true
                    },
                },
                {
                    $unwind: {
                        path: "$categories",
                        preserveNullAndEmptyArrays: true
                    },
                },
            ]);

            let storeWithDistance = []

            for (const tStore of stores) {

                const data: StoreDetailsResponse = {
                    ...tStore,
                    _id: tStore._id.toString(),
                    categories: tStore.categories?.map((e: any): string => e.name),
                    category: tStore.category?.name,
                    service: tStore.service ?? false,
                    distance: (tStore.distance as number).toFixed(2),
                };
                const response = internalRunTimeResponseValidation<StoreDetailsResponse>(
                    StoreDetailsSchema as any,
                    data
                );

                if (response.error) {
                    res.status(500).json(response.error); // Stop execution if error occurs
                    return;
                }
                storeWithDistance.push(response.data);
            }
            res.status(200).json(storeWithDistance);
        } catch (error) {
            onCatchError(error, res);
        }
    }
);

router.route('/').get(searchStoresByProductNameV2);
router.route('/freelance').get(searchStoresByProductNameV2);

export {router as searchRouter};