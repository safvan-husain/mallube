import {Request} from 'express';
import {Router} from 'express';
import {TypedResponse} from "../../../types/requestion";
import {onCatchError, runtimeValidation} from "../../service/serviceContoller";
import {employeeIdAndMonth, monthSchema} from "../validations";
import {z} from "zod";
import {AppError} from "../../service/requestValidationTypes";
import {getUTCMonthRangeFromISTDate} from "../../../schemas/commom.schema";
import Attendance from "../../../models/EmployeeAttendance";
import {getStaffIdsByManagerId} from "./pending-business-controller";

const attendanceRecord = z.object({
    date: z.number(),
    present: z.number(),
    absent: z.number()
})

type AttendanceRecord = z.infer<typeof attendanceRecord>;

export const getAttendanceListForMonth = async (req: Request, res: TypedResponse<AttendanceRecord[]>) => {
    try {
        if (!req.employee?._id) {
            throw new AppError("Not authorized", 403);
        }

        const month = monthSchema.parse(req.query);
        const dateRange = getUTCMonthRangeFromISTDate(month.month);

        // Get all staff under this manager
        const staffIds = await getStaffIdsByManagerId(req.employee._id);

        // Get daily attendance counts using aggregation
        const attendanceCounts = await Attendance.aggregate([
            {
                $match: {
                    assigned: {$in: staffIds},
                    punchIn: {
                        $gte: dateRange.start,
                        $lte: dateRange.end
                    }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$punchIn",
                            timezone: "Asia/Kolkata"
                        }
                    },
                    present: {$addToSet: "$assigned"}
                }
            },
            {
                $project: {
                    _id: 0,
                    date: {$toLong: {$toDate: "$_id"}},
                    present: {$size: "$present"},
                    absent: {$subtract: [{$size: staffIds}, {$size: "$present"}]}
                }
            },
            {
                $sort: {date: 1}
            }
        ]);

        res.status(200).json(attendanceCounts);
    } catch (e) {
        onCatchError(e, res);
    }
}

const employeeDayAttendanceStatus = z.object({
    date: z.number(),
    //when it is null, it means staff was absent that day
    attendance: z.object({
        punchIn: z.number(),
        punchOut: z.number(),
    }).nullable()
})
type EmployeeDayStatus = z.infer<typeof employeeDayAttendanceStatus>;

export const getAttendanceOfSpecificEmployeeSpecificMonth = async (req: Request, res: TypedResponse<EmployeeDayStatus[]>) => {
    try {
        const data = employeeIdAndMonth.parse(req.query);
        let resulList: EmployeeDayStatus[] = [];
        //TODO: implement logic to retarive the history from Attendance model
        res.status(200).json(runtimeValidation(employeeDayAttendanceStatus, resulList));
    } catch (e) {
        onCatchError(e, res);
    }
}

