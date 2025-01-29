import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import Advertisement from "../../models/advertisementModel";
import { IAddAdvertisementPlanSchema } from "../../schemas/advertisement.schema";

export const fetchAllAdvertisement = asyncHandler(
  async (req: Request, res: Response) => {
    console.log("called fetch all ads");

    try {
      const advertisements = await Advertisement.aggregate([
        //finding store name using ID.
        {
          $lookup: {
            from: 'stores', // Name of the store collection
            localField: 'store', // Field in the Product collection
            foreignField: '_id', // Field in the Store collection
            as: 'storeDetails', // Output array field
          },
        },
        //advertiesement created by admin will not have store field, so specifing it include on the following stages (even if those field are null).
        {
          $unwind: {
            path: '$storeDetails',
            preserveNullAndEmptyArrays: true, // This will include documents without a store
          },
        },
        {
          $addFields: {
            store: {
              $ifNull: ['$storeDetails.uniqueName', null],
            }
          },
        },
        {
          $unset: 'storeDetails',
        },
        {
          $lookup: {
            from: 'advertisementplans', // Name of the store collection
            localField: 'adPlan', // Field in the Product collection
            foreignField: '_id', // Field in the Store collection
            as: 'ad_plan_details', // Output array field
          },
        },
        {
          $unwind: {
            path: '$ad_plan_details',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $addFields: {
            plan_name: {
              $ifNull: ['$ad_plan_details.name', null]
            },
          },
        },
        {
          $unset: 'ad_plan_details',
        },
        //we want to only include document which either posted by admin or have store owner.
        //TODO: comment the below stage and delete all the previous ads.
        {
          $match: {
            $or: [
              { store: { $ne: null } }, { isPostedByAdmin: true },
            ],
          },
        },
      ]);

      res.status(200).json(advertisements);
    } catch (error) {
      console.log("error at fetch all ads", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

export const fetchRelaventAdvertisement = asyncHandler(
  async (req: Request, res: Response) => {
    const { latitude, longitude } = req.query;

    try {
      const advertisements = await Advertisement.aggregate([
        {
          $match: {
            isActive: true
          }
        },
        {
          $addFields: {
            show: {
              $function: {
                //calculating distance between two points (userLocation, advertisementLocation)
                //then checking that distance is less than or equal to radius ( checking whether user is in the area of advertisement)
                body: function (location: { coordinates: Array<number> } | undefined | null, lat1: number, long1: number, radius: number): boolean {
                  if (location === null || location === undefined) {
                    return false;
                  }
                  const [lon2, lat2] = location!.coordinates;
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
        },
      ]);
      res.status(200).json(advertisements);
    } catch (error) {
      console.log(error);

      res.status(500).json({ message: "Error fetching advertisements" });
    }

  }
);

//TODO: make sure its IST, and works fine.
export const updateAdvertisementStatus = asyncHandler(async (req: Request, res: Response) => {
  try {
    let advertisement = await Advertisement.findById(req.body.advertisementId).populate("adPlan");
    if (!advertisement) {
      res.status(404).json({ message: "Advertisement not found" });
      return;
    }
    if (req.body.isActive) {
      //if ad is by admin, we want to have unlimitted time.
      if (!advertisement.isPostedByAdmin) {
        const planDurationInHours = ((advertisement.adPlan as unknown) as IAddAdvertisementPlanSchema).duration;
        const expireAt = new Date(Date.now() + planDurationInHours * 60 * 60 * 1000); // Add the hours based on the plan        
        advertisement.expireAt = expireAt;
      }
      advertisement.isActive = true;
      advertisement = await advertisement.save();
    } else {
      advertisement.isActive = false;
      advertisement.expireAt = undefined;
      advertisement = await advertisement.save();
    }
    res.status(200).json({ message: `Successfully ${req.body.isActive ? "approved" : "canceled"}`, advertisement });
  } catch (error) {
    console.log("error ar approve ads", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
)

export const rePublishRequestAnAdvertisement = asyncHandler(async (req: Request, res: Response) => {
  const advertisementId = req.query.advertisementId;
  try {
    var existingAdvertisement = await Advertisement.findById(advertisementId);
    if (existingAdvertisement == undefined) {
      res.status(401).json({ message: "Advertisement doesn't exist" });
      return;
    }
    const { location, image, isActive, store, radius, radiusInRadians, adPlan, timestamp } = existingAdvertisement;
    var newAdvertisement = new Advertisement({
      location,
      image,
      isActive,
      store,
      radius,
      radiusInRadians,
      adPlan,
    });
    newAdvertisement = await newAdvertisement.save();
    res.status(201).json({ message: "New advertisement created" });
  } catch (error) {
    console.log("error ar republish", error);
    res.status(500).json({ message: "Internal server error" });
  }

})


export const periodicallyChangeStatusOfExpiredAdvertisemets = () => {
  setInterval(async () => {
    try {
      const expiredAdvertisements = await Advertisement.find({
        expireAt: { $lt: new Date() },
        isActive: true,
      });
      if (expiredAdvertisements) {
        for (var expiredAd of expiredAdvertisements) {
          expiredAd.isActive = false;
          expiredAd.save();
        }
      }
    } catch (error) {
      console.log("error at periodicallyChangeStatusOfExpiredAdvertisemets", error);

    }

  }, 60000 * 10);
}