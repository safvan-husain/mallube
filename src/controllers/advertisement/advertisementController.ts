import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import Advertisement, {AdvertisementStatus, IAdvertisement} from "../../models/advertisementModel";
import { IAddAdvertisementPlanSchema } from "../../schemas/advertisement.schema";
import AdvertisementPlan, {IAdvertisementPlan} from "../../models/advertismentPlanModel";
import {Types} from "mongoose";
import Store, {IStore} from "../../models/storeModel";
import {ICustomRequest, TypedResponse} from "../../types/requestion";
import {onCatchError} from "../service/serviceContoller";
import {z} from "zod";
import {ObjectIdSchema} from "../../types/validation";


interface StoreAdvertisementResponse {
  _id: string;
  image: string;
  store: Types.ObjectId;
  expireAt: number;
  status: AdvertisementStatus;
  isActive: boolean;
}

export const AddAdvertisement = async (req: any, res: TypedResponse<{
  advertisement: StoreAdvertisementResponse,
  message: string
}>) => {
  try {
    const storeId = req.store;
    if(!Types.ObjectId.isValid(storeId ?? "")) {
      res.status(403).json({ message: "Invalid store id"});
      return;
    }
    const { image, radius, adPlan } = z.object({
      image: z.string().url(),
      radius: z.number(),
      adPlan: ObjectIdSchema
    }).parse(req.body);

    const c = await Store.findById(storeId);
    const earthRadiusInMeters = 6378137; // Earth's radius in meters
    const radiusInRadians = radius / earthRadiusInMeters;
    const newAdvertisement = new Advertisement({
      image,
      store: storeId,
      radius: radius || 10,
      location: c?.location,
      radiusInRadians,
      adPlan
    });
    let ad = await newAdvertisement.save();
    res.status(201).json({ message: "Advertisement added successfully", advertisement: {
      _id: ad._id,
      image: ad.image,
      store: storeId as unknown as Types.ObjectId,
      expireAt: ad.expireAt?.getTime() ?? 0,
      status: ad.status ?? "pending",
      isActive: false,
      } });
  } catch (error) {
    onCatchError(error, res);
  }
};

export const fetchAllStoreAdvertisement = async (req: ICustomRequest<any>, res: TypedResponse<StoreAdvertisementResponse[]>): Promise<void> => {
  try {
    const storeId = req.store?._id;

    if (!storeId || !Types.ObjectId.isValid(storeId)) {
      res.status(400).json({ message: "Store ID is required" });
      return;
    }

    const advertisements: IAdvertisement<IStore, IAdvertisementPlan>[] = await Advertisement.find({ store: storeId })
        // .populate('store', 'uniqueName')
        // .populate('adPlan', 'name')
        .lean();

    const processedAds: StoreAdvertisementResponse[] = advertisements.map((ad) : StoreAdvertisementResponse => ({
      _id: ad._id,
      image: ad.image,
      status: ad.status ?? "pending",
      store: storeId as unknown as Types.ObjectId,
      expireAt: ad.expireAt?.getTime() ?? 0,
      isActive: ad.isActive ?? false,
      //TODO: delete later.
      plan_name: ad.adPlan?.name,
      advertisementDisplayStatus: 'hideFromBothCarousal',
      adPlan: "",
      location: ad.location,
      radius: ad.radius,
      radiusInRadians: ad.radiusInRadians,
      timestamp: Date.now()
      //use type safety.
    } as any));

    res.status(200).json(processedAds);
  } catch (error) {
    console.error('Error fetching store advertisements:', error);
    res.status(500).json({
      message: "Failed to fetch advertisements",
      // error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const fetchAllStoreAdvertisement2 = async (req: any, res: Response) => {
  try {
    const storeId = req.store._id;
    // const advertisements = await Advertisement.find({ store: storeId });
    const advertisements = await Advertisement.aggregate([
      {
        $match: {
          store: new Types.ObjectId(storeId)
        }
      },
      {
        $lookup: {
          from: 'stores', // Name of the store collection
          localField: 'store', // Field in the Product collection
          foreignField: '_id', // Field in the Store collection
          as: 'storeDetails', // Output array field
        },
      },
      {
        $unwind: '$storeDetails', // Convert the array to an object
      },
      {
        $addFields: {
          store: '$storeDetails.uniqueName', // Map storeDetails.name to store
        },
      },
      {
        $unset: 'storeDetails', // Optionally remove the storeDetails field
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
        $unwind: '$ad_plan_details', // Convert the array to an object
      },
      {
        $addFields: {
          plan_name: '$ad_plan_details.name', // Map storeDetails.name to
          //
          // TODO: remove later (added as fix for initila play store fix)
          advertisementDisplayStatus: "hideFromBothCarousal"
        },
      },
      {
        $unset: 'ad_plan_details', // Optionally remove the storeDetails field
      },
    ]);
    //TODO: remove the maping for efficancy, added since some older data don't have isActive field
    res.status(200).json(advertisements.map((i) => {
      if (i.isActive == undefined) {
        i.isActive = false;
      }
      return i;
    }));
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

//TODO: add pagination. for admin.
export const fetchAllAdvertisement = asyncHandler(
  async (req: Request, res: Response) => {
    console.log("called fetch all ads");

    try {
      var advertisements = await Advertisement.aggregate([
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

      res.status(200).json(advertisements.reverse());
    } catch (error) {
      console.log("error at fetch all ads", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

//TODO: check this and fix.
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
                body: function (location: { coordinates: Array<number> } | undefined | null, lat1: number, long1: number, radius: number, isPostedByAdmin: boolean): boolean {
                  //we want to show admin posted ads to everyone regarless of location.
                  if (isPostedByAdmin) return true;
                  if (location === null || location === undefined) {
                    return false;
                  }
                  const [lat2, lon2] = location!.coordinates;
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
                args: ["$location", latitude, longitude, "$radius", "$isPostedByAdmin"],
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
    const { advertisementId, isActive } = z.object({
      advertisementId: ObjectIdSchema,
      isActive: z.boolean()
    }).parse(req.body);
    let advertisement = await Advertisement.findById(advertisementId).populate("adPlan");
    if (!advertisement) {
      res.status(404).json({ message: "Advertisement not found" });
      return;
    }
    if (isActive) {
      //if ad is by admin, we want to have unlimitted time.
      if (!advertisement.isPostedByAdmin) {
        const planDurationInHours = ((advertisement.adPlan as unknown) as IAddAdvertisementPlanSchema).duration;
        const expireAt = new Date(Date.now() + planDurationInHours * 60 * 60 * 1000); // Add the hours based on the plan        
        advertisement.expireAt = expireAt;
      }
      advertisement.status = 'live';
      advertisement.isActive = true;
      advertisement = await advertisement.save();
    } else {
      advertisement.status = 'rejected';
      advertisement.isActive = false;
      //TODO: why undefined.
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

export const rePublishRequestAnAdvertisement = asyncHandler(async (req: ICustomRequest<any>, res: TypedResponse<{ message: string, advertisement: StoreAdvertisementResponse}>) => {
  const advertisementId = req.query.advertisementId;
  try {
    if(!req.store?._id) {
      res.status(403).json({ message: "Store id is required"});
      return;
    }
    let existingAdvertisement = await Advertisement.findById(advertisementId);
    if (existingAdvertisement == undefined) {
      res.status(401).json({ message: "Advertisement doesn't exist" });
      return;
    }
    const { location, image, isActive, store, radius, radiusInRadians, adPlan, createdAt } = existingAdvertisement;
    const advertisementPlan = await AdvertisementPlan.findById(adPlan);
    if(!advertisementPlan) {
      res.status(400).json({ message: "The same plan no longer exist, please create a new"});
      return;
    }
    let newAdvertisement = new Advertisement({
      location,
      image,
      isActive,
      store,
      radius,
      radiusInRadians,
      adPlan,
    });
    newAdvertisement = await newAdvertisement.save();
    res.status(201).json({ message: "New advertisement created", advertisement: {
        _id: newAdvertisement._id,
        image: newAdvertisement.image,
        expireAt: newAdvertisement.expireAt?.getTime() ?? 0,
        status: newAdvertisement.status,
        //TODO: delete later.
        isActive: newAdvertisement.isActive ?? false,
        store: newAdvertisement.store as Types.ObjectId,
        advertisementDisaplay: 'hideFromBothCarousal',
        adPlan: "",
        location: newAdvertisement.location,
        radius: newAdvertisement.radius,
        radiusInRadians: newAdvertisement.radiusInRadians,
        timestamp: Date.now()
        //use type safety.
      } as any});
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
        for (let expiredAd of expiredAdvertisements) {
          expiredAd.isActive = false;
          expiredAd.status = 'expired';
          expiredAd.save();
        }
      }
    } catch (error) {
      console.log("error at periodicallyChangeStatusOfExpiredAdvertisemets", error);
    }

  }, 60000 * 10);
}