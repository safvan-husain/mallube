import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

import SubscriptionPlan from "../../models/subscriptionModel";

export const getSubscriptionPlans = asyncHandler(
  async (_: Request, res: Response): Promise<any> => {
    const subscriptionPlans = await SubscriptionPlan.find({});
    return res.status(200).json(subscriptionPlans);
  }
);
