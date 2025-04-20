import {Request, Response, Router} from "express";
import asyncHandler from "express-async-handler";
import {Types, Schema} from "mongoose";
import {onCatchError} from "../../service/serviceContoller";
import {querySchema, UpdateUserProductSchema, CreateUserProductSchema} from "./validation";
import UserProduct, {IUserProduct, UserProductResponse} from "../../../models/user_product";
import {calculateDistance} from "../../../utils/interfaces/common";
import Category from "../../../models/categoryModel";
import {ICustomRequest, TypedResponse} from "../../../types/requestion";
import {createdAtIST} from "../../../utils/ist_time";

export const createUserPoduct = asyncHandler(
    async (req: ICustomRequest<any>, res: Response) => {
        const id = req.user?._id;
        if (!Types.ObjectId.isValid(id as string)) {
            res.status(400).json({message: "Invalid id"})
            return;
        }

        let location = (req.body.latitude != undefined && req.body.longitude != undefined) ? {
            type: "Point",
            coordinates: [req.body.latitude, req.body.longitude]
        } : undefined;

        try {
            const data = CreateUserProductSchema.parse({
                ...req.body,
                location,
                owner: id
            });
            const product = await UserProduct.create(data);
            res.status(200).json(product);
        } catch (error) {
            // console.log(error);
            onCatchError(error, res);
        }
    }
)

export const updateUserProduct = asyncHandler(
    async (req: Request, res: TypedResponse<UserProductResponse>) => {
        try {
            const id = req.params.id;
            if (!Types.ObjectId.isValid(id)) {
                res.status(400).json({message: "Invalid id"})
            }
            const data = UpdateUserProductSchema.parse({
                ...req.body,
                location: req.body.latitude && req.body.longitude ? {
                    type: "Point",
                    coordinates: [req.body.latitude, req.body.longitude]
                } : undefined
            });
            const product = await UserProduct.findByIdAndUpdate(id, data, {new: true}).populate<{owner: {phone: string, _id: string}}>('owner', 'phone');
            if (!product) {
                res.status(404).json({message: "Product not found"})
                return;
            }
            res.status(200).json(product.forResponse(0, product.owner.phone, product.owner._id));
        } catch (error) {
            console.log(error);
            onCatchError(error, res);
        }
    }
)

export const deleteUserProduct = asyncHandler(
    async (req: Request, res: Response) => {
        try {
            const id = req.params.id;
            if (!Types.ObjectId.isValid(id)) {
                res.status(400).json({message: "Invalid id"})
            }
            const product = await UserProduct.findById(id);

            if (product) {
                let r = await product?.deleteImagesFromBucket()
                await UserProduct.findByIdAndDelete(id);
                res.status(200).json({message: "Product deleted", r})
            } else {
                res.status(404).json({message: "Product not found"})
            }
        } catch (error) {
            console.log(error);
            onCatchError(error, res);
        }
    }
)

export const getPoductDetails = asyncHandler(
    async (req: Request, res: Response) => {
        try {
            const {id, latitude, longitude} = req.params;
            if (!Types.ObjectId.isValid(id)) {
                res.status(400).json({message: "Invalid id"})
            }
            const product = await UserProduct.findById(id).lean();
            if (!product) {
                res.status(404).json({message: "Product not found"})
                return;
            }
            let distance = "";
            if (latitude && longitude) {
                distance = calculateDistance(
                    parseFloat(latitude),
                    parseFloat(longitude),
                    product.location.coordinates[0],
                    product.location.coordinates[1],
                ).toFixed(2);
            }
            let result = {
                ...product,
                distance
            }
            res.status(200).json(result);
        } catch (error) {
            console.log(error);
            onCatchError(error, res);
        }
    }
)

export const getUserProducts = asyncHandler(
    async (req: Request, res: TypedResponse<UserProductResponse[]>) => {
        try {
            const {searchTerm, latitude, longitude, categoryId, skip, limit} = await querySchema.parseAsync(req.query);

            var pipeline = [];

            if (searchTerm) {
                const tCategories = await Category.find({name: {$regex: new RegExp(searchTerm as string, 'i')}}, {_id: 1}).lean();
                const categoryIds = tCategories.map(category => category._id);
                pipeline.push({
                    $match: {
                        $or: [
                            {name: {$regex: searchTerm, $options: 'i'}},
                            {description: {$regex: searchTerm, $options: 'i'}},
                            {keywords: {$regex: searchTerm, $options: 'i'}},
                            {category: {$in: categoryIds}},
                        ]
                    }
                });
            }

            if (categoryId) {
                pipeline.push({
                    $match: {
                        category: categoryId
                    }
                });
            }

            if (latitude != undefined && longitude != undefined) {
                pipeline.push({
                    $addFields: {
                        distance: {
                            $function: {
                                //calculating distance between two points (userLocation, advertisementLocation)
                                body: function (
                                    location: {
                                        coordinates: Array<number>
                                    } | undefined | null, lat1: number, lon1: number,
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

                                    const distance = 2 * r * Math.asin(Math.sqrt(a));
                                    const distanceInMeters = distance; // Convert to meters
                                    const distanceInKM = distanceInMeters * 1.60934
                                    return distanceInKM;
                                },
                                args: ["$location", latitude, longitude],
                                lang: "js"

                            }
                        }
                    }
                });
            }

            const products = await UserProduct.aggregate([
                ...pipeline,
                {$sort: {distance: 1, _id: 1}},
                {$skip: skip},
                {$limit: limit},
                {
                    $lookup: {
                        from: "users", // Collection name for categories
                        localField: "owner",
                        foreignField: "_id",
                        as: "owner_details",
                    }
                },
                {
                    $project: {
                        // "_id": "67c596a2cb3fd0db97fc153e",
                        "name": 1,
                        "images": 1,
                        "price": 1,
                        "category": 1,
                        "keyWords": 1,
                        "owner": 1,
                        "isShowPhone": 1,
                        "createdAt": 1,
                        "distance": 1,
                        description: 1,
                        locationName: 1,
                        "phone": {
                            "$ifNull": [{"$arrayElemAt": ["$owner_details.phone", 0]}, "N/A"]
                        }
                    }
                }
            ]);

            res.status(200).json(products.map(e => ({
                ...e,
                distance: (e.distance as number).toFixed(2),
                createdAt: e.createdAt.getTime(),
            })));
        } catch (error) {
            onCatchError(error, res);
        }
    }
)

//TODO: change isEnabled/
export const getUserProductsCategories = asyncHandler(
    async (req: Request, res: Response) => {
        try {
            const categories = await Category.find({isEnabledForIndividual: true}, {name: 1});
            res.status(200).json(categories);
        } catch (error) {
            console.log(error);
            onCatchError(error, res);
        }
    }
)

export const getUserMyAds = asyncHandler(
    async (req: Request, res: Response) => {
        try {
            const id = req.user?._id;
            if (!Types.ObjectId.isValid(id as string)) {
                res.status(400).json({message: "Invalid id"})
                return;
            }
            const products = await UserProduct.find({owner: id}, {
                name: true,
                images: true, description: true,
                price: true, category: true,
                keyWords: true, isShowPhone: true,
                createdAt: true, distance: true,
                owner: true, locationName: true, expireAt: true
            }).lean();

            res.status(200).json(products.map(e => ({
                ...e,
                distance: '0',
                createdAt: e.createdAt.getTime(),
                expireAt: e.expireAt?.getTime() ?? 0,
            })));
        } catch (error) {
            console.log(error);
            onCatchError(error, res);
        }
    }
)

export const removeExpiredAds = async (): Promise<void> => {
    try {
        const expiredAds = await UserProduct.find({expireAt: {$lt: createdAtIST()}}).lean();
        if (expiredAds.length === 0) return;
        const expiredAdsIds = expiredAds.map((e) => e._id);
        await Promise.all(expiredAds.map(e => e.deleteImagesFromBucket()));
        await UserProduct.deleteMany({_id: {$in: expiredAdsIds}});
    } catch (error) {
        console.log(error);
    }
}