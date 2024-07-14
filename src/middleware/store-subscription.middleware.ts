import asyncHandler from "express-async-handler";
import { RequestWithStaff } from "../utils/interfaces/interfaces";
import Store from "../models/storeModel";
import { NextFunction, Response } from "express";

export const storeSubscription = asyncHandler(
  async (req: Request | any, res: Response, next: NextFunction) => {
    const subscriptionDetails = await Store.findById(req.store._id)
      .select("subscription.plan")
      .populate("subscription.plan");

    req.store.subscription = subscriptionDetails?.subscription.plan;

    next();
  }
);
