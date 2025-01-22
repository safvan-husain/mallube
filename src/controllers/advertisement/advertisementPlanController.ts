import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import AdvertisementPlan from "../../models/advertismentPlanModel";
import { ICustomRequest } from "../../types/requestion";
import { IAddAdvertisementPlanSchema } from "../../schemas/advertisement.schema";


export const createNewAdvertisementPlan = asyncHandler(
    async (req: ICustomRequest<IAddAdvertisementPlanSchema>, res: Response) => {
        const { name, price, duration, maxRadius } = req.body;
        const maxRadiusInRadians = maxRadius / 6371;
        const advertisementPlan = new AdvertisementPlan({
            name,
            price,
            duration,
            maxRadius,
            maxRadiusInRadians
        });

        await advertisementPlan.save();

        res.status(201).json(advertisementPlan);
    }
)

export const fetchAllAdvertisementPlan = asyncHandler(
    async (req: Request, res: Response) => {
        const advertisementPlans = await AdvertisementPlan.find({});

        res.status(200).json(advertisementPlans ?? []);
    }
)