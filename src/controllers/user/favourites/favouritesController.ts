import {Request, Response} from "express";
import asyncHandler from "express-async-handler";
import {UserFavRequestValidationSchema} from "./validation";
import {ICustomRequest, TypedResponse} from "../../../types/requestion";
import User from "../../../models/userModel";
import {safeRuntimeValidation, onCatchError} from "../../service/serviceContoller";
import Store from "../../../models/storeModel";
import {Freelancer} from "../../../models/freelancerModel";
import {Types} from "mongoose";
import Product from "../../../models/productModel";
import UserProduct, {UserProductResponse} from "../../../models/user_product";
import {calculateDistance} from "../../../utils/interfaces/common";
import {z} from "zod";
import {locationSchema} from "../buy_and_sell/validation";
import {StoreDetailsResponse, StoreDetailsSchema} from "../userController";


export const toggleFavorite = asyncHandler(async (req: ICustomRequest<any>, res: Response) => {
    try {
        const userId = req.user?._id;
        const {shopId, freelancerId, userProduct} = UserFavRequestValidationSchema.parse(req.body);

        const fieldKey = shopId ? "favouriteShops" : freelancerId ? "favouriteFreelancers" : userProduct ? "favouriteUserProducts" : null;
        const fieldValue = (shopId || freelancerId || userProduct) as Types.ObjectId;

        if (!fieldKey) {
            res.status(400).json({message: "Invalid request"})
            return;
        }

        const user = await User.findById(userId, {[fieldKey]: 1});
        if (!user) {
            res.status(404).json({message: "User not found"});
            return;
        }

        // Check if item is already in favorites
        const isFavourited = user[fieldKey]?.includes(fieldValue);

        // Toggle favorite status
        const update = isFavourited
            ? {$pull: {[fieldKey]: fieldValue}} // Remove if already favorited
            : {$addToSet: {[fieldKey]: fieldValue}}; // Add if not favorited

        await User.findByIdAndUpdate(userId, update);
        res.status(200).json({
            message: isFavourited ? "Removed from favorites" : "Added to favorites",
            isFavourited: !isFavourited
        });
    } catch (error) {
        onCatchError(error, res);
    }
});


export const getFavoriteShops = asyncHandler(
    async (req: ICustomRequest<any>, res: TypedResponse<StoreDetailsResponse[]>) => {
        try {
            const userId = req.user?._id;
            const user = await User.findById(userId);
            if (!user) {
                res.status(404).json({message: "User not found"});
                return;
            }

            if (user.favouriteShops.length === 0) {
                res.status(200).json([]);
                return;
            }
            let responseList: StoreDetailsResponse[] = [];
            const shops = await Store
                .find({_id: {$in: user.favouriteShops}}, {
                    storeName: true, bio: true, address: true, storeOwnerName: true,
                    openTime: true, closeTime: true, isDeliveryAvailable: true,
                    instagram: true, facebook: true, whatsapp: true,
                    phone: true, shopImgUrl: true,
                    service: true, location: true, city: true, type: true,
                })
                .populate<{ category: { name: string } }>('category', "name")
                .populate<{ categories: { name: string }[] }>('categories', "name")
                .lean();

            for (const shop of shops) {
                //TODO: correct this for type safety.
                const validation = safeRuntimeValidation<StoreDetailsResponse>(StoreDetailsSchema as any, {
                    ...shop,
                    category: shop.category?.name,
                    categories: shop.categories?.map(e => e.name)
                } as any);
                if (validation.error) {
                    res.status(500).json(validation.error);
                    return;
                }
                responseList.push(validation.data)
            }
            res.status(200).json(responseList);
        } catch (error) {
            onCatchError(error, res);
        }
    }
)

export const getFavoriteFreelancers = asyncHandler(
    async (req: ICustomRequest<any>, res: TypedResponse<StoreDetailsResponse[]>) => {
        try {
            const userId = req.user?._id;
            const user = await User.findById(userId);
            if (!user) {
                res.status(404).json({message: "User not found"});
                return;
            }
            if (user.favouriteFreelancers.length === 0) {
                res.status(404).json([]);
                return;
            }
            let responseList: StoreDetailsResponse[] = [];

            const freelancers = await Store
                .find({_id: {$in: user.favouriteFreelancers}}).find({_id: {$in: user.favouriteFreelancers}}, {
                    storeName: true, bio: true, address: true, storeOwnerName: true,
                    openTime: true, closeTime: true, isDeliveryAvailable: true,
                    instagram: true, facebook: true, whatsapp: true,
                    phone: true, shopImgUrl: true,
                    service: true, location: true, city: true, type: true,
                })
                .populate<{ category: { name: string } }>('category', "name")
                .populate<{ categories: { name: string }[] }>('categories', "name")
                .lean();

            for (const freelancer of freelancers) {
                //TODO: correct this for type safety.
                const validation = safeRuntimeValidation<StoreDetailsResponse>(StoreDetailsSchema as any, {
                    ...freelancer,
                    category: freelancer.category?.name,
                    categories: freelancer.categories?.map(e => e.name)
                } as any);
                if (validation.error) {
                    res.status(500).json(validation.error);
                    return;
                }
                responseList.push(validation.data)
            }
            res.status(200).json(responseList);
        } catch (error) {
            onCatchError(error, res);
        }
    }
)

export const getFavoriteUserProducts = asyncHandler(
    async (req: ICustomRequest<any>, res: TypedResponse<UserProductResponse[]>) => {
        try {
            const userId = req.user?._id;
            const data = locationSchema.parse(req.query);
            const user = await User.findById(userId, {favouriteUserProducts: 1});
            if (!user) {
                res.status(404).json({message: "User not found"});
                return;
            }
            if (user.favouriteUserProducts.length === 0) {
                res.status(404).json([]);
                return;
            }
            const products = await UserProduct.find({_id: {$in: user.favouriteUserProducts}}).populate<{
                owner: { phone: string, _id: string }
            }>('owner', 'phone');
            res.status(200).json(products.map(e => {
                const distance = calculateDistance(e.location.coordinates[0], e.location.coordinates[1], data.latitude, data.longitude);
                return e.forResponse(distance, e.owner.phone, e.owner._id);
            }));
        } catch (error) {
            onCatchError(error, res);
        }
    }
)
