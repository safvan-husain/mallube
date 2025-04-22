import {TypedResponse} from "../../../types/requestion";
import {onCatchError, runtimeValidation} from "../../service/serviceContoller";
import {addStoreSchema} from "../../../schemas/store.schema";
import {createAndSaveStore, getBusinessDataById, updateStore} from "../../../service/store";
import Category from "../../../models/categoryModel";
import {
    getCreatedAtFilterFromDateRange,
    getUTCMonthRangeFromISTDate,
    zodObjectForMDObjectId
} from "../../../schemas/commom.schema";
import {Request} from 'express';
import {
    EmployeeBusinessListItem,
    EmployeeBusinessListItemSchema,
    ZStore
} from "../../store/validation/store_validation";
import {FilterQuery, ObjectId, Types} from "mongoose";
import Employee, {employeePrivilegeSchema, IEmployee} from "../../../models/managerModel";
import {
    determineStaffIdWithQueryData,
    ensureRequesterIsManager,
    getStaffAndBusinessCountsFromData
} from "./pending-business-controller";
import {
    AddedCountPerDate,
    addedCountPerDateSchema,
    allRangeOfDateSchema,
    businessCountPerStaffSchema,
    getEmployeeStoreQuerySchema, graphResultSchema,
    monthAndBusinessTypeSchema,
    monthAndStaffIdSchema,
    pendingStoreQuerySchema,
    StaffAndBusinessCount,
    staffAndBusinessCountSchema
} from "../validations";
import Store, {IStore} from "../../../models/storeModel";
import {IPendingBusiness, PendingBusiness} from "../../../models/PendingBusiness";
import {AppError} from "../../service/requestValidationTypes";
import Target from "../../../models/Target";

export const createBusiness = async (req: Request, res: TypedResponse<EmployeeBusinessListItem>) => {
    try {
        if (req.employee!.privilege !== employeePrivilegeSchema.enum.staff) {
            res.status(403).json({message: "Not authorized to create store"});
            return;
        }
        const data = addStoreSchema.parse(req.body);
        const {validatedData} = await createAndSaveStore({
            rawBody: {...data, plainPassword: data.phone},
            addedBy: req.employee!._id
        });
        await Target.achieveTarget(req.employee!._id!);

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
        const {id} = zodObjectForMDObjectId.parse(req.params);
        const store = await getBusinessDataById(id);
        res.status(200).json(store);
    } catch (e) {
        onCatchError(e, res);
    }
}

export const updateBusinessProfile = async (req: Request, res: TypedResponse<EmployeeBusinessListItem>) => {
    try {
        const {id} = zodObjectForMDObjectId.parse(req.params);
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

async function getCommaSeparatedCategoryNames(ids: ObjectId[] | string[]): Promise<string> {
    return await Category
        .find({_id: {$in: ids}}, {name: true})
        .lean<{ name: string }[]>().then(e => e.map(k => k.name).join(", "));
}

export const businessCountAddedByStaffPerManager = async (req: Request, res: TypedResponse<StaffAndBusinessCount[]>) => {
    try {
        await ensureRequesterIsManager(req.employee);
        const query = businessCountPerStaffSchema.parse(req.query);

        const staffs = await Employee
            .find({manager: req.employee?._id},
                {_id: 1, name: 1, username: 1, place: 1, city: 1, district: 1, dayTarget: 1, monthTarget: 1})
            .lean<{
                _id: Types.ObjectId,
                name: string,
                username: string,
                place: string,
                city: string,
                district: string,
                dayTarget: number,
                monthTarget: number
            }[]>();
        const staffIds = staffs.map(e => e._id);

        const allStaffs = new Map(staffs.map(e => [e._id.toString(), e]));

        let dbQuery: FilterQuery<IStore> = {}
        dbQuery.addedBy = {$in: staffIds};
        const createdAt = getCreatedAtFilterFromDateRange(query);
        if (createdAt) {
            //I want to know the duration between created at and lt, how many days
            const durationMs = createdAt.$lt.getTime() - createdAt.$gte.getTime();
            const durationInDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));
            console.log(`Duration: ${durationInDays} days`);

            dbQuery.createdAt = createdAt;
        }
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

        const finalResult = Array.from(allStaffs.entries()).map(e => ({}));

        res.status(200).json(runtimeValidation(staffAndBusinessCountSchema, getStaffAndBusinessCountsFromData(data, staffs, query)));
    } catch (e) {
        onCatchError(e, res);
    }
}

export const getBusinessCountForStaffPerDayForMonth = async (req: Request, res: TypedResponse<AddedCountPerDate[]>) => {
    try {
        const query = monthAndStaffIdSchema.parse(req.query);

        let staffId = determineStaffIdWithQueryData(req.employee, query);

        let dbQuery: FilterQuery<IStore> = {};
        dbQuery.addedBy = staffId;

        const createdAt = getCreatedAtFilterFromDateRange(query);
        if (createdAt) dbQuery.createdAt = createdAt;

        dbQuery.type = query.businessType;

        const data: {
            _id: string,
            count: number,
            dateMillis: number
        }[] = await Store.aggregate([
            {
                $match: dbQuery
            },
            //Grouping with created at date, converting IST to get accurate day calculation.
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
        //TODO: add target.
        let s: AddedCountPerDate[] = data.map(e => {
            return {date: e.dateMillis, count : e.count, target: 0 }
        });
        res.status(200).json(runtimeValidation<AddedCountPerDate>(addedCountPerDateSchema,  s));
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
        if (createdAt) dbQuery.createdAt = createdAt;

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
            if (!query.addedBy) {
                res.status(400).json({message: "addedBy is required for manager"})
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

export const getGraphDataForMonth = async (req: Request, res: TypedResponse<any>) => {
    try {
        const {month, businessType } = monthAndBusinessTypeSchema.parse(req.query);
        let dbQuery: FilterQuery<IStore> = {
            type: businessType
        }
        const range = getUTCMonthRangeFromISTDate(month)
        dbQuery.createdAt = {$gte: range.start, $lt: range.end};
        dbQuery.addedBy = await buildAddedByQuery(req.employee!).then(e => e.addedBy);

        const data = await Store.aggregate([
            {
                $match: dbQuery
            },
            {
                $project: {
                    createdDay: {
                        $dateToString: {
                            date: "$createdAt",
                            format: "%d",
                            timezone: "Asia/Kolkata"
                        }
                    }
                }
            },
            {
                $group: {
                    _id: "$createdDay",
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    day: "$_id",
                    count: 1
                }
            }
        ]);
        res.status(200).json(runtimeValidation(graphResultSchema, data));
    } catch (e) {
        onCatchError(e, res);
    }
}

/**
 * Builds a query filter based on employee privilege to restrict access to relevant records
 * @param employee - The employee object from the request (middleware [protectedEmployee])
 * @returns A MongoDB query filter for the 'addedBy' field
 */
export async function buildAddedByQuery(employee: IEmployee): Promise<{ addedBy: Types.ObjectId | { $in: Types.ObjectId[] } }> {
    if (employee.privilege === employeePrivilegeSchema.enum.staff) {
        return { addedBy: employee._id! };
    } else if (employee.privilege === employeePrivilegeSchema.enum.manager) {
        const staffIds = await Employee
            .find({ manager: employee._id }, { _id: 1 })
            .lean<{ _id: Types.ObjectId }[]>()
            .then(e => e.map(e => e._id));
        return { addedBy: { $in: staffIds } };
    }
    throw new AppError("Not authorized to access these records", 403);
}

export function getStaffAndBusinessCountsFromData(
    data: {
        _id: Types.ObjectId,
        businessCount: number
    }[],
    staffs: StaffNameAndU[],
    query?: { startDate?: Date, endDate?: Date }
): StaffAndBusinessCount[] {
    let responseList: StaffAndBusinessCount[] = [];

    // Determine if we're looking at a day or month range
    let targetType: 'day' | 'month' | null = null;
    if (query?.startDate && query?.endDate) {
        const diffTime = Math.abs(query.endDate.getTime() - query.startDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            targetType = 'day';
        } else if (diffDays >= 28 && diffDays <= 31) {
            targetType = 'month';
        }
    }

    for (let item of data) {
        const staff = staffs.find(e => e._id.toString() === item._id.toString());

        let target = null;
        if (targetType === 'day') {
            target = staff?.dayTarget ?? 0;
        } else if (targetType === 'month') {
            target = staff?.monthTarget ?? 0;
        }

        responseList.push({
            businessCount: item.businessCount,
            target,
            staffUserName: staff?.username ?? "Unknown Error",
            staffName: staff?.name ?? "Unknown Error",
            place: staff?.place ?? "Unknown Error",
            city: staff?.city ?? "Unknown Error",
            district: staff?.district ?? "Unknown Error",
        })
    }
    return responseList;
}

type StaffNameAndU = {
    _id: Types.ObjectId;
    name: string;
    username: string;
    place: string;
    city: string;
    district: string;
    dayTarget: number;
    monthTarget: number;
};