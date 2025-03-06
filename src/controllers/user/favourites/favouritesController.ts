import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { UserFavRequestValidationSchema } from "./validation";
import { ICustomRequest } from "../../../types/requestion";
import User from "../../../models/userModel";
import { onCatchError } from "../../service/serviceContoller";
import Store from "../../../models/storeModel";
import { Freelancer } from "../../../models/freelancerModel";
import { Types } from "mongoose";


export const toggleFavorite = asyncHandler(async (req: ICustomRequest<any>, res: Response) => {
    try {
        const userId = req.user?._id;
        const { shopId, freelancerId } = UserFavRequestValidationSchema.parse(req.body);

        const fieldKey = shopId ? "favouriteShops" : freelancerId ? "favouriteFreelancers" : null;
        const fieldValue = (shopId || freelancerId) as Types.ObjectId;

        if (!fieldKey) {
            res.status(400).json({ message: "Invalid request" })
            return;
        }

        const user = await User.findById(userId);
        if (!user){
            res.status(404).json({ message: "User not found" });
            return;
        } 

        // Check if item is already in favorites
        const isFavorited = user[fieldKey]?.includes(fieldValue);

        // Toggle favorite status
        const update = isFavorited
            ? { $pull: { [fieldKey]: fieldValue } } // Remove if already favorited
            : { $addToSet: { [fieldKey]: fieldValue } }; // Add if not favorited

        await User.findByIdAndUpdate(userId, update);
        res.status(200).json({ message: isFavorited ? "Removed from favorites" : "Added to favorites", isFavorited: !isFavorited });
    } catch (error) {
        onCatchError(error, res);
    }
});


export const getFavoriteShops = asyncHandler(
    async (req: ICustomRequest<any>, res: Response) => {
        try {
            const userId = req.user?._id;
            const user = await User.findById(userId);
            if (!user) {
                res.status(404).json({ message: "User not found" });
                return;
            }

            if (user.favouriteShops.length === 0) {
                res.status(404).json({ message: "No favorite shops found" });
                return;
            }
            const shops = await Store.find({ _id: { $in: user.favouriteShops } });
            res.status(200).json(shops);
        } catch (error) {
            onCatchError(error, res);
        }
    }
)

export const getFavoriteFreelancers = asyncHandler(
    async (req: ICustomRequest<any>, res: Response) => {
        try {
            const userId = req.user?._id;
            const user = await User.findById(userId);
            if (!user) {
                res.status(404).json({ message: "User not found" });
                return;
            }
            if (user.favouriteFreelancers.length === 0) {
                res.status(404).json({ message: "No favorite shops found" });
                return;
            }
            const freelancers = await Freelancer.find({ _id: { $in: user.favouriteFreelancers } });
            res.status(200).json(freelancers);
        } catch (error) {
            onCatchError(error, res);
        }
    }
)