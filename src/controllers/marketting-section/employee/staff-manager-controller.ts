import {z} from 'zod';
import {ICustomRequest, TypedResponse} from "../../../types/requestion";
import {onCatchError, runtimeValidation, safeRuntimeValidation} from "../../service/serviceContoller";
import {
    getCreatedAtFilterFromDateRange,
    getUTCMonthRangeFromISTDate,
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
import Target from "../../../models/Target";
import Attendance from "../../../models/EmployeeAttendance";

export const createEmployee = async (req: Request, res: TypedResponse<MinimalManagerResponseForAdmin>) => {
    try {
        let data = createEmployeeSchema.parse(req.body);

        if (req.url.includes('staff')) {
            if (req.employee && req.employee.privilege === employeePrivilegeSchema.enum.manager) {
                data.privilege = 'staff';
                data.manager = req.employee._id;
            } else {
                throw new AppError("Should be employee to create staff", 403);
            }
        }
        const employeeExists = await Employee.findOne({$or: [{username: data.username}, {phone: data.phone}]});
        if (employeeExists) {
            let message = "Employee already exists with ";
            if (employeeExists.username === data.username && employeeExists.phone === data.phone) {
                message += "both username and phone.";
            } else if (employeeExists.username === data.username) {
                message += "username.";
            } else {
                message += "phone.";
            }
            res.status(400).json({message});
            return;
        }
        const employee = await Employee.create<TEmployee>({
            ...data,
            hashedPassword: data.password,
        });
        await Target.setTarget(employee._id, 'day', data.dayTarget);
        await Target.setTarget(employee._id, 'month', data.monthTarget);

        let response = safeRuntimeValidation(minimalManagerResponseForAdminSchema, employee);
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
        const data = updateEmployeeSchema.parse(req.body);
        const employeeId = z.object({
            id: ObjectIdSchema
        }).parse(req.params).id;

        if (data.monthTarget) {
            await Target.setTarget(employeeId, 'month', data.monthTarget);
        }
        if (data.dayTarget) {
            await Target.setTarget(employeeId, 'day', data.dayTarget);
        }

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

        //when employee make request
        if (req.employee) {
            if (req.employee.privilege === employeePrivilegeSchema.enum.manager) {
                dbQuery.privilege = employeePrivilegeSchema.enum.staff;
                dbQuery.manager = req.employee._id;
            } else {
                throw new AppError("Should be employee to get staff", 403);
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

export const markAttendance = async (req: Request, res: TypedResponse<any>) => {
    try {
        switch (req.path) {
            case "punch-in":
                await Attendance.punchIn(req.employee!._id!);
                break;
            case "punch-out":
                await Attendance.punchOut(req.employee!._id!);
                break;
            default:
                res.status(400).json({ message: "Cannot identify action"});
                return;
        }
        res.status(200).json({ message: `Successfully ${req.path.replace("-", " ")}`});
    } catch (e) {
        onCatchError(e, res);
    }
}
