import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import Advertisement from "../../models/advertisementModel";

export const fetchAllAdvertisement = asyncHandler(
  async (req: Request, res: Response) => {
    const advertisements = await Advertisement.find({});

    if (advertisements) {
      res.status(200).json(advertisements);
    } else {
      res.status(500);
      throw new Error("Product not found");
    }
  }
);
