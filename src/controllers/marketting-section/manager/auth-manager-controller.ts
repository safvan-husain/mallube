import {z} from 'zod';
import {ICustomRequest, TypedResponse} from "../../../types/requestion";
import {onCatchError, runtimeValidation, safeRuntimeValidation} from "../../service/serviceContoller";
import {
    getCreatedAtFilterFromDateRange,
    getMonthRangeFromISTDate,
    istFromStringOrNumberSchema,
    ObjectIdSchema,
    optionalDateFiltersSchema,
    phoneZodValidation
} from "../../../schemas/commom.schema";
import Employee, {
    employeePrivilegeSchema,
    IEmployee,
    TEmployee,
    TEmployeePrivilege
} from "../../../models/managerModel";
import {FilterQuery, ObjectId, Types} from 'mongoose';
import bcrypt from "bcryptjs";
import {Request} from 'express';
import {AppError} from "../../service/requestValidationTypes";
import {
    AddedCountPerDate,
    addedCountPerDateSchema,
    allRangeOfDateSchema,
    businessCountPerStaffSchema,
    createEmployeeSchema,
    EmployeeWholeDataRes,
    employeeWholeDataResSchema,
    FullDashboardStats, FullDashboardStatsSchema,
    MinimalManagerResponseForAdmin,
    minimalManagerResponseForAdminSchema,
    monthAndStaffIdSchema,
    PendingBusinessWholeRes,
    pendingBusinessWholeResponseSchema,
    pendingStoreDashBoardQuerySchema,
    PendingStoreMinimal,
    pendingStoreMinimalSchema,
    pendingStoreQuerySchema,
    pendingStoreSchema,
    StaffAndBusinessCount,
    staffAndBusinessCountSchema,
    updateEmployeeSchema,
    updatePendingStoreSchema
} from "../validations";
import {IPendingBusiness, PendingBusiness, pendingBusinessStatus} from "../../../models/PendingBusiness";

export const createEmployee = async (req: Request, res: TypedResponse<MinimalManagerResponseForAdmin>) => {
    try {
        let data = createEmployeeSchema.parse(req.body);

        if (req.url.includes('staff')) {
            if (req.employee && req.employee.privilege === employeePrivilegeSchema.enum.manager) {
                data.privilege = 'staff';
                data.manager = req.employee._id;
            } else {
                throw new AppError("Should be manager to create staff", 403);
            }
        }
        const managerExist = await Employee.findOne({$or: [{username: data.username}, {phone: data.phone}]});
        if (managerExist) {
            let message = "Manager already exists with ";
            if (managerExist.username === data.username && managerExist.phone === data.phone) {
                message += "both username and phone.";
            } else if (managerExist.username === data.username) {
                message += "username.";
            } else {
                message += "phone.";
            }
            res.status(400).json({message});
            return;
        }
        const manager = await Employee.create<TEmployee>({
            ...data,
            hashedPassword: data.password,
        });
        let response = safeRuntimeValidation(minimalManagerResponseForAdminSchema, manager);
        if (response.error != null) {
            res.status(500).json(response.error)
            return;
        }
        res.status(200).json(response.data);
    } catch (e) {
        onCatchError(e, res);
    }
}

export const updateEmployee = async (req: Request, res: TypedResponse<MinimalManagerResponseForAdmin>) => {
    try {
        //TODO: correct this when handling admin.

        // if(!req.employee) {
        //     res.status(403).json({message: "Not authorized"})
        //     return;
        // }
        // if (req.employee.privilege !== employeePrivilegeSchema.enum.manager) {
        //     res.status(403).json({message: "Not authorized, only valid for manager"})
        //     return;
        // }
        const data = updateEmployeeSchema.parse(req.body);
        const employeeId = z.object({
            id: ObjectIdSchema
        }).parse(req.params).id;

        const employeeToUpdate = await Employee.findById(employeeId);
        if (!employeeToUpdate) {
            res.status(404).json({message: "Employee not found"});
            return;
        }

        // Check if username or phone is being changed, and is unique
        if (data.username || data.phone) {
            let $or = [];
            if (data.username) {
                $or.push({username: data.username});
            }
            if (data.phone) {
                $or.push({phone: data.phone});
            }

            const existing = await Employee.findOne({
                $or,
                _id: {$ne: employeeId} // Exclude the current employee
            });

            if (existing) {
                let message = "Another employee already exists with ";
                if (existing.username === data.username && existing.phone === data.phone) {
                    message += "both username and phone.";
                } else if (existing.username === data.username) {
                    message += "username.";
                } else {
                    message += "phone.";
                }
                res.status(400).json({message});
                return;
            }
        }

        // Perform the update
        Object.assign(employeeToUpdate, data);
        await employeeToUpdate.save();

        const response = safeRuntimeValidation(minimalManagerResponseForAdminSchema, employeeToUpdate);
        if (response.error != null) {
            res.status(500).json(response.error);
            return;
        }

        res.status(200).json(response.data);
    } catch (e) {
        onCatchError(e, res);
    }
};

export const getAllEmployeesOfPrivilege = async (req: ICustomRequest<any>, res: TypedResponse<MinimalManagerResponseForAdmin[]>) => {
    try {
        const query = z.object({
            privilege: employeePrivilegeSchema.optional().default('staff')
        }).parse(req.query);

        let dbQuery: FilterQuery<IEmployee> = {
            privilege: query.privilege,
        };

        //when manager make request
        if (req.employee) {
            if (req.employee.privilege === employeePrivilegeSchema.enum.manager) {
                dbQuery.privilege = employeePrivilegeSchema.enum.staff;
                dbQuery.manager = req.employee._id;
            } else {
                throw new AppError("Should be manager to get staff", 403);
            }
        } else {
            //TODO: otherwise should be admin
        }

        const managers = await Employee.find(dbQuery, {
            phone: true,
            name: true,
            username: true,
            city: true,
            district: true,
            place: true,
            isActive: true
        }).lean();

        let responseList = [];
        for (let manager of managers) {
            let response = safeRuntimeValidation(minimalManagerResponseForAdminSchema, manager);
            if (response.error != null) {
                res.status(500).json(response.error)
                return;
            }
            responseList.push(response.data);
        }

        res.status(200).json(responseList);
    } catch (e) {
        onCatchError(e, res);
    }
}

export const getSpecificEmployee = async (req: ICustomRequest<any>, res: TypedResponse<EmployeeWholeDataRes>) => {
    try {
        const {id} = z.object({
            id: ObjectIdSchema
        }).parse(req.params);

        const manager = await Employee.findById(id, {}).lean();
        if (!manager) {
            res.status(400).json({message: "Manager not found"});
            return;
        }
        res.status(200).json(runtimeValidation<EmployeeWholeDataRes>(
            employeeWholeDataResSchema,
            {
                ...manager,
                joinedDate: manager.joinedDate?.getTime() as number,
                resignedDate: manager.resignedDate?.getTime()
            }));
    } catch (e) {
        onCatchError(e, res);
    }
}

export const deleteManager = async (req: ICustomRequest<any>, res: TypedResponse<never>) => {
    try {
        const {id} = z.object({
            id: ObjectIdSchema
        }).parse(req.params);
        const manager = await Employee.findByIdAndDelete(id);
        if (!manager) {
            res.status(400).json({message: "Manager not found"});
            return;
        }
        res.status(200).json({message: "Manager deleted successfully"});
    } catch (e) {
        onCatchError(e, res);
    }
}

export const loginEmployee = async (req: Request, res: TypedResponse<{
    token?: string,
    username: string,
    privilege: TEmployeePrivilege
}>) => {
    try {
        const requestData = z.object({
            username: z.string(),
            password: z.string()
        }).parse(req.body);

        const employee = await Employee.findOne({username: requestData.username}, {
            hashedPassword: 1,
            privilege: 1,
            username: 1
        });
        if (!employee) {
            res.status(400).json({message: "Manager not found"});
            return;
        }
        console.log(employee)
        const isMatch = await bcrypt.compare(requestData.password, employee.hashedPassword);
        if (!isMatch) {
            res.status(400).json({message: "Invalid password"});
            return;
        } else {
            const token = employee.generateAuthToken();
            res.status(200).json({token, username: employee.username, privilege: employee.privilege});
            return;
        }
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

        let s = {...savedData.toObject(), categoryName: savedData.category.name, lastContacted: undefined};
        console.log(s)
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

        dbQuery.createdAt = getCreatedAtFilterFromDateRange(query);

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

        //when manager pass a specific staff.
        if (query.createdBy) {
            dbQuery.createdBy = query.createdBy;
        }

        //only provide store he created if it is requested by staff.
        if (req.employee.privilege === employeePrivilegeSchema.enum.staff) {
            dbQuery.createdBy = req.employee._id;
        }

        const businesses = await PendingBusiness
            .find(dbQuery)
            .populate<{ category: { name: string } }>('category', 'name')
            .lean();

        const validatedData = runtimeValidation(pendingStoreMinimalSchema, businesses.map(e => ({
            ...e,
            categoryName: e.category.name,
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

        // Only the creator or a manager can update
        const isCreator = String(pendingStore.createdBy) === String(req.employee._id);
        const isManager = req.employee.privilege !== employeePrivilegeSchema.enum.staff;
        if (!isCreator && !isManager) {
            return res.status(403).json({message: "Not authorized to update this store"});
        }

        Object.assign(pendingStore, data);
        const updatedStore = await (await pendingStore.save()).populate<{
            category: { name: string }
        }>('category', 'name');


        const validatedData = runtimeValidation(pendingStoreMinimalSchema, {
            ...updatedStore.toObject(),
            lastContacted: updatedStore.lastContacted?.getTime(),
            categoryName: updatedStore.category.name
        });

        res.status(200).json(validatedData);
    } catch (err) {
        onCatchError(err, res);
    }
};

export const getStaffAndBusinessCount = async (req: Request, res: TypedResponse<StaffAndBusinessCount[]>) => {
    try {
        if (!req.employee) {
            res.status(403).json({message: "Not authorized"})
            return;
        }

        if (req.employee.privilege !== employeePrivilegeSchema.enum.manager) {
            res.status(403).json({message: "Not authorized, only valid for manager"})
            return;
        }
        const query = businessCountPerStaffSchema.parse(req.query);
        let dbQuery: FilterQuery<IPendingBusiness> = {};

        const createdAt = getCreatedAtFilterFromDateRange(query);
        if (createdAt) {
            dbQuery.createdAt = createdAt;
        }
        dbQuery.businessType = query.businessType;

        const staffs = await Employee
            .find({manager: req.employee},
                {_id: 1, name: 1, username: 1, place: 1, city: 1, district: 1})
            .lean();
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
        let responseList: StaffAndBusinessCount[] = [];
        for (let item of data) {
            const staff = staffs.find(e => e._id = item._id);

            responseList.push({
                businessCount: item.businessCount,
                staffUserName: staff?.username ?? "Unknown Error",
                staffName: staff?.name ?? "Unknown Error",
                place: staff?.place ?? "Unknown Error",
                city: staff?.city ?? "Unknown Error",
                district: staff?.district ?? "Unknown Error",
            })
        }
        res.status(200).json(runtimeValidation(staffAndBusinessCountSchema, responseList));
    } catch (e) {
        onCatchError(e, res);
    }
}

export const getPendingBusinessCountForStaffPerDayForMonth = async (req: Request, res: TypedResponse<AddedCountPerDate[]>) => {
    try {
        if (!req.employee) {
            res.status(403).json({message: "Not authorized"})
            return;
        }
        const query = monthAndStaffIdSchema.parse(req.query);

        let staffId;

        switch (req.employee.privilege) {
            case employeePrivilegeSchema.enum.manager:
                if (!query.staffId) {
                    res.status(400).json({message: "staffId is required for manager"})
                    return;
                }
                staffId = query.staffId;
                break;
            case employeePrivilegeSchema.enum.staff:
                staffId = req.employee._id;
                break;
        }

        if (!staffId) {
            res.status(500).json({message: "Could not infer staff"})
            return
        }

        let dbQuery: FilterQuery<IPendingBusiness> = {};
        dbQuery.createdBy = staffId;
        dbQuery.createdAt = getCreatedAtFilterFromDateRange(query);
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

export const getPendingBusinessDashBoardData = async (req: Request, res: TypedResponse<FullDashboardStats>) => {
    try {
        if (!req.employee) {
            res.status(403).json({message: "Not authorized"})
            return;
        }
        let dbMatchQuery: FilterQuery<IPendingBusiness> = {};

        if(req.employee.privilege === employeePrivilegeSchema.enum.manager) {
            const staffIds = (await Employee.find({manager: req.employee._id}, {_id: 1}).lean()).map(e => e._id)
            dbMatchQuery.createdBy = {$in: staffIds}
        } else if (req.employee.privilege === employeePrivilegeSchema.enum.staff) {
            dbMatchQuery.createdBy = req.employee._id;
        } else {
            throw new AppError("Should be manager or staff", 400);
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
                                businessType: "store",
                                createdAt: {$gte: startOfTodayUTC},
                            },
                        },
                        {$count: "count"},
                    ],
                    storeMonth: [
                        {
                            $match: {
                                businessType: "store",
                                createdAt: {$gte: startOfMonthUTC},
                            },
                        },
                        {$count: "count"},
                    ],
                    storeTotal: [
                        {
                            $match: {
                                businessType: "store",
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
                    store: {
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

async function buildQueryByPrivilege(employee: IEmployee): Promise<FilterQuery<IPendingBusiness>> {
    const {privilege, _id} = employee;

    switch (privilege) {
        // case employeePrivilegeSchema.enum.admin:
        //     // Admins can see all pending businesses
        //     return {};

        case employeePrivilegeSchema.enum.manager:
            // Managers can see their staff's pending businesses
            const staffIds: Types.ObjectId[] = await Employee.find(
                {manager: _id},
                {_id: 1}
            ).lean().then(staff => staff.map(e => e._id));
            let ids: Types.ObjectId[] = [_id as Types.ObjectId, ...staffIds];
            return {createdBy: {$in: ids}}; // Include manager's own submissions

        case employeePrivilegeSchema.enum.staff:
            // Staff can only see their own pending businesses
            return {createdBy: _id};

        default:
            // Default case for type safety
            return {createdBy: _id};
    }
}