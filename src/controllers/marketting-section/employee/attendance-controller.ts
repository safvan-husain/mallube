import {Request} from 'express';
import {TypedResponse} from "../../../types/requestion";
import {onCatchError, runtimeValidation} from "../../service/serviceContoller";
import {employeeIdAndMonth, monthSchema} from "../validations";
import {z} from "zod";
import {daySchema, getUTCMonthRangeFromISTDate} from "../../../schemas/commom.schema";
import Attendance from "../../../models/EmployeeAttendance";
import {getStaffIdsByManagerId} from "./pending-business-controller";
import Employee from "../../../models/managerModel";

const attendanceRecord = z.object({
    date: z.number(),
    present: z.number(),
    absent: z.number()
})

type AttendanceRecord = z.infer<typeof attendanceRecord>;

export const getAttendanceListForMonth = async (req: Request, res: TypedResponse<AttendanceRecord[]>) => {
    try {
        const month = monthSchema.parse(req.query);
        const dateRange = getUTCMonthRangeFromISTDate(month.month);

        // Get all staff under this manager
        const staffIds = await getStaffIdsByManagerId(req.employee!._id);

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
                    absent: {$subtract: [staffIds.length, {$size: "$present"}]}
                }
            },
            {
                $sort: {date: 1}
            }
        ]);

        res.status(200).json(runtimeValidation(attendanceRecord, attendanceCounts));
    } catch (e) {
        onCatchError(e, res);
    }
}

const employeeDayAttendanceStatus = z.object({
    date: z.number(),
    //when it is null, it means staff was absent that day
    attendance: z.object({
        punchIn: z.number(),
        punchOut: z.number().nullable(),
    }).nullable()
})
type EmployeeDayStatus = z.infer<typeof employeeDayAttendanceStatus>;

export const getAttendanceOfSpecificEmployeeSpecificMonth = async (req: Request, res: TypedResponse<EmployeeDayStatus[]>) => {
    try {
        const data = employeeIdAndMonth.parse(req.query);
        const dateRange = getUTCMonthRangeFromISTDate(data.month);
        
        // Generate all dates in the month
        const allDates: Date[] = [];
        const currentDate = new Date(dateRange.start);
        while (currentDate <= dateRange.end) {
            allDates.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Get attendance records for the month
        const attendanceRecords = await Attendance.aggregate([
            {
                $match: {
                    assigned: data.id,
                    punchIn: {
                        $gte: dateRange.start,
                        $lte: dateRange.end
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    date: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$punchIn",
                            timezone: "Asia/Kolkata"
                        }
                    },
                    punchIn: { $toLong: "$punchIn" },
                    punchOut: { 
                        $cond: {
                            if: { $eq: ["$punchOut", null] },
                            then: null,
                            else: { $toLong: "$punchOut" }
                        }
                    }
                }
            }
        ]);

        // Create attendance map for quick lookup
        const attendanceMap = new Map(
            attendanceRecords.map(record => [record.date, {
                punchIn: record.punchIn,
                punchOut: record.punchOut
            }])
        );

        // Create final result with all days
        const resultList: EmployeeDayStatus[] = allDates.map(date => {
            const dateStr = date.toISOString().split('T')[0];
            const attendance = attendanceMap.get(dateStr);
            
            return {
                date: date.getTime(),
                attendance: attendance || null
            };
        });

        res.status(200).json(runtimeValidation(employeeDayAttendanceStatus, resultList));
    } catch (e) {
        onCatchError(e, res);
    }
}

const attendanceRecordWithTimeOFAStaff = z.object({
    username: z.string(),
    name: z.string(),
    city: z.string(),
    district: z.string(),
    //when it is null, it means staff was absent that day
    attendance: z.object({
        punchIn: z.number(),
        //when it is null, it means staff is not punched out yet
        punchOut: z.number().nullable(),
    }).nullable()
});

type AttendanceRecordWithTimeOFAStaff = z.infer<typeof attendanceRecordWithTimeOFAStaff>;

export const getAllStaffAttendanceForThisDay = async (req: Request, res: TypedResponse<AttendanceRecordWithTimeOFAStaff[]>) => {
    try {
        const data = daySchema.parse(req.query);
        const startOfDay = new Date(data.day);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(data.day);
        endOfDay.setHours(23, 59, 59, 999);

        const staffIds = await getStaffIdsByManagerId(req.employee?._id!);

        // Get all employees first
        const allEmployees = await Employee.find(
            { _id: { $in: staffIds } },
            { username: 1, name: 1, city: 1, district: 1 }
        ).lean();

        // Get attendance data
        const attendanceData = await Attendance.aggregate([
            {
                $match: {
                    assigned: { $in: staffIds },
                    punchIn: {
                        $gte: startOfDay,
                        $lte: endOfDay
                    }
                }
            },
            {
                $project: {
                    assigned: 1,
                    punchIn: { $toLong: "$punchIn" },
                    punchOut: {
                        $cond: {
                            if: { $eq: ["$punchOut", null] },
                            then: null,
                            else: { $toLong: "$punchOut" }
                        }
                    }
                }
            }
        ]);

        // Create attendance map for quick lookup
        const attendanceMap = new Map(
            attendanceData.map(record => [
                record.assigned.toString(),
                { punchIn: record.punchIn, punchOut: record.punchOut }
            ])
        );

        // Combine employee data with attendance
        const finalData = allEmployees.map(employee => ({
            username: employee.username,
            name: employee.name,
            city: employee.city,
            district: employee.district,
            attendance: attendanceMap.get(employee._id.toString()) || null
        }));

        res.status(200).json(runtimeValidation(attendanceRecordWithTimeOFAStaff, finalData));
    } catch (e) {
        onCatchError(e, res);
    }
}