import {TypedResponse} from "../../../types/requestion";
import {onCatchError, runtimeValidation} from "../../service/serviceContoller";
import {addStoreSchema} from "../../../schemas/store.schema";
import {createAndSaveStore, getBusinessDataById, updateStore } from "../../../service/store";
import Category from "../../../models/categoryModel";
import {getCreatedAtFilterFromDateRange, zodObjectForMDObjectId} from "../../../schemas/commom.schema";
import { Request } from 'express';
import {
    EmployeeBusinessListItem,
    EmployeeBusinessListItemSchema,
    ZStore
} from "../../store/validation/store_validation";
import {FilterQuery, ObjectId, Types} from "mongoose";
import Employee, {employeePrivilegeSchema} from "../../../models/managerModel";
import {
    determineStaffId,
    ensureRequesterIsManager,
    getStaffAndBusinessCountsFromData
} from "./pending-business-controller";
import {
    AddedCountPerDate, addedCountPerDateSchema,
    businessCountPerStaffSchema, getEmployeeStoreQuerySchema, monthAndStaffIdSchema, pendingStoreQuerySchema,
    StaffAndBusinessCount,
    staffAndBusinessCountSchema
} from "../validations";
import Store, {IStore} from "../../../models/storeModel";
import {IPendingBusiness, PendingBusiness} from "../../../models/PendingBusiness";

export const createBusiness = async (req: Request, res: TypedResponse<EmployeeBusinessListItem>) => {
    try {
        if(!req.employee) {
            res.status(403).json({ message: "Not authorized"});
            return;
        }
        if(req.employee?.privilege !== employeePrivilegeSchema.enum.staff) {
            res.status(403).json({ message: "Not authorized to create store"});
            return;
        }
        const data = addStoreSchema.parse(req.body);
        const { validatedData } = await createAndSaveStore({ rawBody: {...data, plainPassword: data.phone}, addedBy: req.employee._id});

        res.status(201).json({
            _id: validatedData._id.toString(),
            storeName: validatedData.storeName,
            storeOwnerName: validatedData.storeOwnerName,
            categoriesName: await getCommaSeparatedCategoryNames(validatedData.categories),
            place: validatedData.city,
            district: validatedData.district,
        });
    } catch (e) {
        onCatchError(e, res);
    }
}

export const getBusinessProfile = async (req: Request, res: TypedResponse<ZStore>) => {
    try {
        const { id } = zodObjectForMDObjectId.parse(req.params);
        const store = await getBusinessDataById(id);
        res.status(200).json(store);
    } catch (e) {
        onCatchError(e, res);
    }
}

export const updateBusinessProfile = async (req: Request, res: TypedResponse<EmployeeBusinessListItem>) => {
    try {
        const { id } = zodObjectForMDObjectId.parse(req.params);
        const validatedData = await updateStore({
            storeId: id.toString(),
            updateData: req.body
        });
        res.status(200).json({
            _id: validatedData._id.toString(),
            storeName: validatedData.storeName,
            storeOwnerName: validatedData.storeOwnerName,
            categoriesName: await getCommaSeparatedCategoryNames(validatedData.categories),
            place: validatedData.city,
            district: validatedData.district,
        })
    } catch (e) {
        onCatchError(e, res);
    }
}

async function getCommaSeparatedCategoryNames(ids: ObjectId[] | string[]) : Promise<string> {
   return await Category
        .find({ _id: { $in: ids }}, { name: true })
        .lean<{name: string}[]>().then(e => e.map(k => k.name).join(", "));
}

export const businessCountAddedByStaffPerManager = async (req: Request, res: TypedResponse<StaffAndBusinessCount[]>) => {
    try {

        await ensureRequesterIsManager(req.employee);

        const query = businessCountPerStaffSchema.parse(req.query);

        const staffs = await Employee
            .find({manager: req.employee?._id},
                {_id: 1, name: 1, username: 1, place: 1, city: 1, district: 1})
            .lean<{ _id: Types.ObjectId, name: string, username: string, place: string, city: string, district: string }[]>();
        const staffIds = staffs.map(e => e._id);

        let dbQuery: FilterQuery<IStore> = {}
        dbQuery.addedBy = {$in: staffIds};
        // dbQuery.createdAt = getCreatedAtFilterFromDateRange(query);
        dbQuery.type = query.businessType;
        console.log(dbQuery);
        const data: {
            _id: Types.ObjectId,
            businessCount: number
        }[] = await Store.aggregate([
            {
                $match: dbQuery
            },
            {
                $group: {
                    _id: "$addedBy",
                    businessCount: {$sum: 1}
                }
            }
        ]);

        console.log(data);

        res.status(200).json(runtimeValidation(staffAndBusinessCountSchema, getStaffAndBusinessCountsFromData(data, staffs)));
    } catch (e) {
        onCatchError(e, res);
    }
}

export const getBusinessCountForStaffPerDayForMonth = async (req: Request, res: TypedResponse<AddedCountPerDate[]>) => {
    try {
        const query = monthAndStaffIdSchema.parse(req.query);

        let staffId = determineStaffId(req.employee, query);

        let dbQuery: FilterQuery<IStore> = {};
        dbQuery.addedBy = staffId;

        const createdAt = getCreatedAtFilterFromDateRange(query);
        if(createdAt) dbQuery.createdAt = createdAt;

        dbQuery.type = query.businessType;

        const data: {
            _id: string,
            count: number,
            dateMillis: number
        }[] = await Store.aggregate([
            {
                $match: dbQuery
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$createdAt",
                            timezone: "Asia/Kolkata"
                        }
                    },
                    count: {$sum: 1},
                    rawDate: {
                        $first: {
                            $dateTrunc: {
                                date: "$createdAt",
                                unit: "day",
                                timezone: "Asia/Kolkata"
                            }
                        }
                    }
                },

            },
            {
                $project: {
                    _id: 1,
                    count: 1,
                    dateMillis: {$toLong: "$rawDate"}
                }
            }
        ])
        res.status(200).json(runtimeValidation(addedCountPerDateSchema, data.map(e => ({...e, date: e.dateMillis}))))
    } catch (e) {
        onCatchError(e, res);
    }
}

export const getBusinessesPerEmployee = async (req: Request, res: TypedResponse<EmployeeBusinessListItem[]>) => {
    try {
        const query = getEmployeeStoreQuerySchema
            .parse(req.query)

        const dbQuery: FilterQuery<IStore> = {};

        dbQuery.type = query.businessType;

        const createdAt = getCreatedAtFilterFromDateRange(query);
        if(createdAt) dbQuery.createdAt = createdAt;

        if (query.searchTerm) {
            const regex = {$regex: query.searchTerm.trim(), $options: "i"}
            dbQuery.$or = [
                {storeName: regex},
                {storeOwnerName: regex},
            ]
        }

        //only provide store he created if it is requested by staff.
        if (req.employee!.privilege === employeePrivilegeSchema.enum.staff) {
            dbQuery.addedBy = req.employee!._id;
        } else if (req.employee!.privilege === employeePrivilegeSchema.enum.manager) {
            if(!query.addedBy) {
                res.status(400).json({ message: "addedBy is required for manager"})
                return;
            }
            dbQuery.addedBy = query.addedBy;
        }
        console.log("query here", dbQuery);

        const data = await Store
            .find(dbQuery, {storeName: true, storeOwnerName: true, categories: true, district: true, city: true})
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
        res.status(200).json(runtimeValidation(EmployeeBusinessListItemSchema, responseList));
    } catch (e) {
        onCatchError(e, res);
    }
}