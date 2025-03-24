import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import AdvertisementPlan from "../../models/advertismentPlanModel";
import {ICustomRequest, TypedResponse} from "../../types/requestion";
import { IAddAdvertisementPlanSchema } from "../../schemas/advertisement.schema";
import {onCatchError} from "../service/serviceContoller";
import {createAdsPlanSchema} from "./validation";


export const createNewAdvertisementPlan = asyncHandler(
    async (req: ICustomRequest<IAddAdvertisementPlanSchema>, res: Response) => {
        try {
            const { maxRadius, ...rest } = createAdsPlanSchema.parse(req.body);
            let maxRadiusInRadians ;
            if(maxRadius) {
                maxRadiusInRadians = maxRadius / 6371;
            }
            const advertisementPlan = new AdvertisementPlan({
                ...rest,
                maxRadius,
                maxRadiusInRadians
            });

            await advertisementPlan.save();
            res.status(201).json(advertisementPlan);
        } catch (error) {
            onCatchError(error, res);
        }
    }
)

export const deleteAdvertisementPlan = asyncHandler(
    async (req: Request, res: Response) => {
        try {
            await AdvertisementPlan.findByIdAndDelete(req.query.planId);
            res.status(200).json({ message: "Successfully deleted" });
        } catch (error) {
            res.status(500).json({ message: "Internal server error 2" });
        }

    }
)

interface AdPlanResponse {
    message?: string;
    _id: string;
    duration: number;
    price: number;
    offerPrice?: number;
    radius: number;
}

export const fetchAllAdvertisementPlan = asyncHandler(
    async (req: Request, res: TypedResponse<AdPlanResponse[]>) => {
        try {
            const advertisementPlans = await AdvertisementPlan.find({});
            res.status(200).json(advertisementPlans.map(e => ({
                message: e.message,
                _id: e._id.toString(),
                duration: e.duration,
                price: e.price,
                offerPrice: e.offerPrice,
                radius: e.maxRadius ?? 0
            })));
        } catch (error) {
            res.status(500).json({ message: "Internal server error" });
        }
    }
)