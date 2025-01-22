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

export const fetchRelaventAdvertisement = asyncHandler(
  async (req: Request, res: Response) => {
    const { latitude, longitude } = req.params;

    try {
      const advertisements = await Advertisement.aggregate([
        {
          $addFields: {
            show: {
              $function: {
                //calculating distance between two points (userLocation, advertisementLocation)
                //then checking that distance is less than or equal to radius ( checking whether user is in the area of advertisement)
                body: function (location: { coordinates: Array<number> }, lat1: number, long1: number, radius: number): boolean {
                  const [lon2, lat2] = location.coordinates;
                  const toRadians = (degrees: number) => degrees * (Math.PI / 180);
                  const R = 6371;
                  const dLat = toRadians(lat2 - lat1);
                  const dLon = toRadians(lon2 - long1);
                  const a =
                    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
                    Math.sin(dLon / 2) * Math.sin(dLon / 2);
                  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                  let distance = R * c;
                  return distance <= radius;

                },
                args: ["$location", latitude, longitude, "$radius"],
                lang: "js"
              }
            }
          },

        },
        {
          $match: {
            show: { $eq: true }
          }
        }
      ]);
      res.status(200).json(advertisements);
    } catch (error) {
      console.log(error);

      res.status(500).json({ message: "Error fetching advertisements" });
    }

  }
);
