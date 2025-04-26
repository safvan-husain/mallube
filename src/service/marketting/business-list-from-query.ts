import {FilterQuery, ObjectId} from "mongoose";
import Store, {IStore} from "../../models/storeModel";
import {
    EmployeeBusinessListItem,
    EmployeeBusinessListItemSchema
} from "../../controllers/store/validation/store_validation";
import {getCommaSeparatedCategoryNames} from "../../controllers/marketting-section/employee/business-manage-controller";
import {runtimeValidation} from "../../error/runtimeValidation";

export const businessListFromQuery = async ({ query, skip, limit }: {query: FilterQuery<IStore>, skip: number, limit: number}): Promise<EmployeeBusinessListItem[]> => {
    const data = await Store
        .find(query, {storeName: true, storeOwnerName: true, categories: true, district: true, city: true})
        .skip(skip)
        .limit(limit)
        .lean<{
            storeName: string,
            storeOwnerName: string,
            categories: ObjectId[],
            district: string,
            city: string,
            _id: ObjectId
        }[]>()

    const responseList = await Promise.all(
        data.map(async e => ({
            _id: e._id.toString(),
            storeName: e.storeName,
            storeOwnerName: e.storeOwnerName,
            categoriesName: await getCommaSeparatedCategoryNames(e.categories),
            place: e.city,
            district: e.district,
        }))
    );

    return runtimeValidation(EmployeeBusinessListItemSchema, responseList);
}