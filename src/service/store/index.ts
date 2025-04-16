import Store, {IStore} from "../../models/storeModel";
import {
  businessAccountTypeSchema,
  IReusableCreateStoreSchema,
  reusableCreateStoreSchema
} from "../../schemas/store.schema";
import {AppError} from "../../controllers/service/requestValidationTypes";
import bcrypt from "bcryptjs";
import {
  savedStoreResponseSchema,
  updateProfileSchema,
  ZStore
} from "../../controllers/store/validation/store_validation";
import {FeedBack} from "../../models/feedbackModel";
import {runtimeValidation} from "../../controllers/service/serviceContoller";
import {ObjectId, Types} from "mongoose";

export async function getStoreByPhoneOrUniqueNameOrEmail(
  phone: string,
  uniqueName: string,
  email: string | undefined
) {
  if (email) {
    return Store.findOne({
      $or: [{phone}, {uniqueName}, {email}],
    });
  }
  return Store.findOne({
    $or: [{phone}, {uniqueName}],
  });
}
//TODO: may not need validate response here.
export const createAndSaveStore = async ({ rawBody, addedBy } : {rawBody: IReusableCreateStoreSchema, addedBy?: Types.ObjectId}) : Promise<{ dbStore: IStore, validatedData: ZStore}> => {
  const data = reusableCreateStoreSchema.parse(rawBody);

  const { latitude, longitude, plainPassword, phone, uniqueName, email, ...rest } = data;

  const existingStore = await getStoreByPhoneOrUniqueNameOrEmail(phone, uniqueName, email);
  if (existingStore) {
    let message: string;
    if (existingStore.email === email) {
      message = "Email already exists";
    } else if (existingStore.phone === phone) {
      message = "Phone number already exists";
    } else {
      message = "Unique name already exists";
    }

    throw new AppError( message, 400);
  }

  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  const location = {
    type: "Point",
    coordinates: [latitude, longitude],
  };

  const subscriptionExpireDate = new Date();
  subscriptionExpireDate.setFullYear(subscriptionExpireDate.getFullYear() + 1);
  let serviceType = data.serviceType;

  if(data.type === businessAccountTypeSchema.enum.freelancer) {
    //freelancer don't have booking feature ["which is in parlor type"]
      serviceType = ['other'];
  }

  const storeDetails = {
    ...rest,
    uniqueName,
    phone,
    password: hashedPassword,
    addedBy,
    email,
    location,
    subscriptionExpireDate,
    serviceType
  };


  const newStore = new Store(storeDetails);
  const savedStore = await newStore.save();

  if (rest.serviceTypeSuggestion) {
    try {
      await new FeedBack({
        storeId: savedStore._id,
        ourQuestion: "Describe your service for store",
        answer: rest.serviceTypeSuggestion
      }).save();
    } catch (e) {
      console.error("Error saving feedback during store creation:", e);
    }
  }

  const validatedData = runtimeValidation<ZStore>(savedStoreResponseSchema as any, {
    ...savedStore.toObject(),
    categories: savedStore.categories.map(e => e.toString()),
    category: savedStore.category?.toString(),
    subCategories: savedStore.subCategories?.map(e => e.toString()),
  } as any)
  return {
    dbStore: savedStore,
    validatedData,
  };
};

export const getBusinessDataById = async (id: string | Types.ObjectId ): Promise<ZStore> => {
  const store = await Store.findById(id).lean();
  if (!store) {
    throw new AppError("Store not found", 404);
  }
  return runtimeValidation(savedStoreResponseSchema, {
    ...store,
    category: store.category?.toString(),
    categories: store.categories?.map((e: any) => e.toString()),
    subCategories: store.subCategories?.map((e: any) => e.toString())
  } as any);
}

export const updateStore =
    async ({
             storeId,
             updateData,
           }: {
      storeId: string;
      updateData: unknown;
    }): Promise<ZStore> => {
      if (!storeId) {
        throw new AppError("storeId is required", 400);
      }

      let parsedFields: any = updateProfileSchema
          .parse(updateData);

      if (parsedFields.plainPassword) {
        parsedFields.password = await bcrypt.hash(parsedFields.plainPassword, 10);
        delete parsedFields.plainPassword;
      }

      const existingStore = await Store.findById(storeId);
      if (!existingStore) {
        throw new AppError("Store not found", 400);
      }

      const updatedStore = await Store.findByIdAndUpdate(storeId, parsedFields, {
        new: true,
      });

      if (!updatedStore) {
        throw new AppError("Failed to update store", 500);
      }

      return runtimeValidation<ZStore>(savedStoreResponseSchema as any, {
        ...updatedStore.toObject(),
        categories: updatedStore.categories.map(e => e.toString()),
        category: updatedStore.category?.toString(),
        subCategories: updatedStore.subCategories?.map(e => e.toString()),
      } as any);
    };
