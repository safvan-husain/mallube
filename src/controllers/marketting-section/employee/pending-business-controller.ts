import {z} from "zod";
import {Request} from "express";
import {TypedResponse} from "../../../types/requestion";
import {
    AddedCountPerDate, addedCountPerDateSchema,
    businessCountPerStaffSchema,
    FullDashboardStats,
    FullDashboardStatsSchema, monthAndStaffIdSchema, PendingBusinessWholeRes, pendingBusinessWholeResponseSchema,
    PendingStoreMinimal,
    pendingStoreMinimalSchema, pendingStoreQuerySchema,
    pendingStoreSchema, StaffAndBusinessCount, staffAndBusinessCountSchema, updatePendingStoreSchema
} from "../validations";
import {FilterQuery, Types} from "mongoose";
import {IPendingBusiness, PendingBusiness} from "../../../models/PendingBusiness";
import Employee, {employeePrivilegeSchema, IEmployee} from "../../../models/managerModel";
import {AppError} from "../../service/requestValidationTypes";
import {onCatchError, runtimeValidation} from "../../service/serviceContoller";
import {getCreatedAtFilterFromDateRange, ObjectIdSchema} from "../../../schemas/commom.schema";

export const getPendingBusinessDashBoardData = async (req: Request, res: TypedResponse<FullDashboardStats>) => {
    try {
        if (!req.employee) {
            res.status(403).json({message: "Not authorized"})
            return;
        }
        let dbMatchQuery: FilterQuery<IPendingBusiness> = {};

        if (req.employee.privilege === employeePrivilegeSchema.enum.manager) {
            const staffIds = (await Employee.find({manager: req.employee._id}, {_id: 1}).lean()).map(e => e._id)
            dbMatchQuery.createdBy = {$in: staffIds}
        } else if (req.employee.privilege === employeePrivilegeSchema.enum.staff) {
            dbMatchQuery.createdBy = req.employee._id;
        } else {
            throw new AppError("Should be employee or staff", 400);
        }
        // const query = pendingStoreDashBoardQuerySchema.parse(req.query);
        const now = new Date();

        // Run in JS to get current date in IST
        const istNow = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));

        // Start of today in IST
        const istStartOfToday = new Date(istNow);
        istStartOfToday.setHours(0, 0, 0, 0);

        // Start of this month in IST
        const istStartOfMonth = new Date(istNow.getFullYear(), istNow.getMonth(), 1);

        // Convert both to UTC before querying MongoDB (since MongoDB stores dates in UTC)
        const startOfTodayUTC = new Date(istStartOfToday.toISOString());
        const startOfMonthUTC = new Date(istStartOfMonth.toISOString());

        const data = await PendingBusiness.aggregate([
            {
                $match: dbMatchQuery
            },
            {
                $facet: {
                    storeToday: [
                        {
                            $match: {
                                businessType: "business",
                                createdAt: {$gte: startOfTodayUTC},
                            },
                        },
                        {$count: "count"},
                    ],
                    storeMonth: [
                        {
                            $match: {
                                businessType: "business",
                                createdAt: {$gte: startOfMonthUTC},
                            },
                        },
                        {$count: "count"},
                    ],
                    storeTotal: [
                        {
                            $match: {
                                businessType: "business",
                            },
                        },
                        {$count: "count"},
                    ],
                    freelancerToday: [
                        {
                            $match: {
                                businessType: "freelancer",
                                createdAt: {$gte: startOfTodayUTC},
                            },
                        },
                        {$count: "count"},
                    ],
                    freelancerMonth: [
                        {
                            $match: {
                                businessType: "freelancer",
                                createdAt: {$gte: startOfMonthUTC},
                            },
                        },
                        {$count: "count"},
                    ],
                    freelancerTotal: [
                        {
                            $match: {
                                businessType: "freelancer",
                            },
                        },
                        {$count: "count"},
                    ],
                },
            },
            {
                $project: {
                    business: {
                        today: {
                            $ifNull: [{$arrayElemAt: ["$storeToday.count", 0]}, 0],
                        },
                        thisMonth: {
                            $ifNull: [{$arrayElemAt: ["$storeMonth.count", 0]}, 0],
                        },
                        total: {
                            $ifNull: [{$arrayElemAt: ["$storeTotal.count", 0]}, 0],
                        },
                    },
                    freelancer: {
                        today: {
                            $ifNull: [{$arrayElemAt: ["$freelancerToday.count", 0]}, 0],
                        },
                        thisMonth: {
                            $ifNull: [{$arrayElemAt: ["$freelancerMonth.count", 0]}, 0],
                        },
                        total: {
                            $ifNull: [{$arrayElemAt: ["$freelancerTotal.count", 0]}, 0],
                        },
                    },
                },
            },
        ]);
        if (data.length === 0) {
            res.status(200).json(FullDashboardStatsSchema.parse({}));
            return
        }
        res.status(200).json(runtimeValidation(FullDashboardStatsSchema, data[0]))
    } catch (e) {
        onCatchError(e, res);
    }
}

export const createPendingStore = async (req: Request, res: TypedResponse<PendingStoreMinimal>) => {
    try {
        if (!req.employee) {
            res.status(403).json({message: "Not authorized"})
            return;
        }
        const data = pendingStoreSchema.parse(req.body);

        const existing = await PendingBusiness.findOne({phone: data.phone});
        if (existing) {
            return res.status(409).json({message: 'Phone number already exists'});
        }

        const pending = new PendingBusiness({
            ...data,
            createdBy: req.employee?._id
        });
        const savedData = (await (await pending.save()).populate<{ category: { name: string } }>('category'));

        let s = {...savedData.toObject(), categoryName: savedData.category?.name ?? "N/A", lastContacted: undefined};
        let validated = runtimeValidation(pendingStoreMinimalSchema, s)
        res.status(201).json(validated);
    } catch (err: any) {
        onCatchError(err, res);
    }
}

export const getPendingStores = async (req: Request, res: TypedResponse<PendingStoreMinimal[]>) => {
    try {
        const query = pendingStoreQuerySchema
            .parse(req.query)

        if (!req.employee) {
            res.status(403).json({message: "Not authorized"})
            return;
        }

        const dbQuery: FilterQuery<IPendingBusiness> = {};

        dbQuery.businessType = query.businessType;

        const createdAt = getCreatedAtFilterFromDateRange(query);
        if(createdAt) dbQuery.createdAt = createdAt;

        if (query.searchTerm) {
            const regex = {$regex: query.searchTerm.trim(), $options: "i"}
            dbQuery.$or = [
                {name: regex},
                {phone: regex},
                {place: regex},
                {nearBy: regex},
                {note: regex},
            ]
        }

        if (query.status) {
            dbQuery.status = query.status;
        }

        //when employee pass a specific staff.
        if (query.createdBy) {
            dbQuery.createdBy = query.createdBy;
        }

        //only provide store he created if it is requested by staff.
        if (req.employee.privilege === employeePrivilegeSchema.enum.staff) {
            dbQuery.createdBy = req.employee._id;
        }

        const businesses = await PendingBusiness
            .find(dbQuery)
            .populate<{ category?: { name: string } }>('category', 'name')
            .lean();

        const validatedData = runtimeValidation(pendingStoreMinimalSchema, businesses.map(e => ({
            ...e,
            categoryName: e.category?.name ?? "N/A",
            lastContacted: e.lastContacted?.getTime()
        })));
        res.status(200).json(validatedData);
    } catch (e) {
        onCatchError(e, res);
    }
}

export const getSpecificPendingBusiness = async (req: Request, res: TypedResponse<PendingBusinessWholeRes>) => {
    try {
        const {id} = z.object({
            id: ObjectIdSchema
        }).parse(req.params);

        const pendingStore = await PendingBusiness.findById(id).lean();
        if (!pendingStore) {
            res.status(400).json({message: "Pending store not found"})
            return;
        }
        const validatedData = runtimeValidation(pendingBusinessWholeResponseSchema, {
            ...pendingStore,
            lastContacted: pendingStore.lastContacted?.getTime()
        })
        res.status(200).json(validatedData);
    } catch (e) {
        onCatchError(e, res);
    }
}

export const updateSpecificPendingBusiness = async (req: Request, res: TypedResponse<PendingStoreMinimal>) => {
    try {
        if (!req.employee) {
            return res.status(403).json({message: "Not authorized"});
        }

        const {id} = z.object({
            id: ObjectIdSchema
        }).parse(req.params);

        const data = updatePendingStoreSchema.parse(req.body); // Allow partial update

        if (data.phone) {
            const existing = await PendingBusiness.findOne({phone: data.phone, _id: {$ne: id}});
            if (existing) {
                return res.status(409).json({message: `Phone number already exists with ${existing.name}`});
            }
        }

        const pendingStore = await PendingBusiness.findById(id);
        if (!pendingStore) {
            return res.status(404).json({message: "Pending store not found"});
        }

        // Only the creator or a employee can update
        const isCreator = String(pendingStore.createdBy) === String(req.employee._id);
        const isManager = req.employee.privilege !== employeePrivilegeSchema.enum.staff;
        if (!isCreator && !isManager) {
            return res.status(403).json({message: "Not authorized to update this store"});
        }

        Object.assign(pendingStore, data);
        const updatedStore = await (await pendingStore.save()).populate<{
            category?: { name: string }
        }>('category', 'name');


        const validatedData = runtimeValidation(pendingStoreMinimalSchema, {
            ...updatedStore.toObject(),
            lastContacted: updatedStore.lastContacted?.getTime(),
            categoryName: updatedStore.category?.name ?? "N/A"
        });

        res.status(200).json(validatedData);
    } catch (err) {
        onCatchError(err, res);
    }
};

export const getStaffAndPendingBusinessCount = async (req: Request, res: TypedResponse<StaffAndBusinessCount[]>) => {
    try {
        await ensureRequesterIsManager(req.employee);

        const query = businessCountPerStaffSchema.parse(req.query);
        let dbQuery: FilterQuery<IPendingBusiness> = {};

        const createdAt = getCreatedAtFilterFromDateRange(query);
        if (createdAt) {
            dbQuery.createdAt = createdAt;
        }
        dbQuery.businessType = query.businessType;

        const staffs = await Employee
            .find({manager: req.employee?._id},
                {_id: 1, name: 1, username: 1, place: 1, city: 1, district: 1})
            .lean<{
                _id: Types.ObjectId,
                name: string,
                username: string,
                place: string,
                city: string,
                district: string
            }[]>();

        const staffIds = staffs.map(e => e._id);
        dbQuery.createdBy = {$in: staffIds};

        const data: {
            _id: Types.ObjectId,
            businessCount: number
        }[] = await PendingBusiness.aggregate([
            {
                $match: dbQuery
            },
            {
                $group: {
                    _id: "$createdBy",
                    businessCount: {$sum: 1}
                }
            }
        ]);
        res.status(200).json(runtimeValidation(staffAndBusinessCountSchema, getStaffAndBusinessCountsFromData(data, staffs)));
    } catch (e) {
        onCatchError(e, res);
    }
}

export const getPendingBusinessCountForStaffPerDayForMonth = async (req: Request, res: TypedResponse<AddedCountPerDate[]>) => {
    try {
        const query = monthAndStaffIdSchema.parse(req.query);

        let staffId = determineStaffId(req.employee, query);

        let dbQuery: FilterQuery<IPendingBusiness> = {};
        dbQuery.createdBy = staffId;

        const createdAt = getCreatedAtFilterFromDateRange(query);
        if(createdAt) dbQuery.createdAt = createdAt;

        dbQuery.businessType = query.businessType;

        const data: {
            _id: string,
            count: number,
            dateMillis: number
        }[] = await PendingBusiness.aggregate([
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

export async function getStaffIdsByManagerId(managerId: Types.ObjectId | string): Promise<Types.ObjectId[]> {
    const staffs = await Employee
        .find({manager: managerId},
            {_id: 1,})
        .lean<{ _id: Types.ObjectId }[]>();

    return staffs.map(e => e._id);
}

export async function ensureRequesterIsManager(manager: IEmployee | undefined) {
    if (!manager) {
        throw new AppError("Not authorized, requester not received", 403);
    }
    if (manager.privilege !== employeePrivilegeSchema.enum.manager) {
        throw new AppError("Not authorized, requester is not a manager", 403);
    }
}

type StaffNameAndU = {
    _id: Types.ObjectId,
    name: string,
    username: string,
    place: string,
    city: string,
    district: string
}

export function getStaffAndBusinessCountsFromData(
    data: {
        _id: Types.ObjectId,
        businessCount: number
    }[],
    staffs: StaffNameAndU[]
): StaffAndBusinessCount[] {
    let responseList: StaffAndBusinessCount[] = [];
    for (let item of data) {
        const staff = staffs.find(e => e._id.toString() === item._id.toString());

        responseList.push({
            businessCount: item.businessCount,
            staffUserName: staff?.username ?? "Unknown Error",
            staffName: staff?.name ?? "Unknown Error",
            place: staff?.place ?? "Unknown Error",
            city: staff?.city ?? "Unknown Error",
            district: staff?.district ?? "Unknown Error",
        })
    }
    return responseList;
}

/**
 * Determines the appropriate staff ID based on employee privilege
 * @param employee - The employee object from the request, middleware [protectedEmployee]
 * @param query - The query parameters object
 * @returns The staff ID
 * @throw AppError
 */
export function determineStaffId(
    employee: IEmployee | undefined,
    query: { staffId?: Types.ObjectId }
): Types.ObjectId {
    if(!employee) {
        throw new AppError("Not authorized", 403);
    }
    switch (employee.privilege) {
        case employeePrivilegeSchema.enum.manager:
            if (!query.staffId) {
                throw new AppError("staffId is required for manager", 400);
            }
            return query.staffId;
        case employeePrivilegeSchema.enum.staff:
            return employee._id!;
        default:
            throw new AppError("Could not infer staff", 400);
    }
}