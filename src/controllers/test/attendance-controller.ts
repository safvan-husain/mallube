
import { Request } from 'express';
import { TypedResponse } from "../../types/requestion";
import Employee from "../../models/managerModel";
import Attendance from "../../models/EmployeeAttendance";
import { Types } from "mongoose";
import {onCatchError} from "../../error/onCatchError";

export const generateRandomAttendance = async (req: Request, res: TypedResponse<{ message: string }>) => {
    try {
        const { managerId, month } = req.body;
        
        // Get all staff under this manager
        const staffList = await Employee.find({ 
            manager: new Types.ObjectId(managerId),
            privilege: 'staff'
        });

        if (!staffList.length) {
            return res.status(404).json({ message: "No staff found under this manager" });
        }

        const monthDate = new Date(month);
        const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();

        for (const staff of staffList) {
            for (let day = 1; day <= daysInMonth; day++) {
                // 80% chance of attendance
                if (Math.random() < 0.8) {
                    const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
                    const punchIn = new Date(date.setHours(9 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60)));
                    const punchOut = new Date(date.setHours(17 + Math.floor(Math.random() * 3), Math.floor(Math.random() * 60)));
                    
                    await Attendance.create({
                        assigned: staff._id,
                        punchIn,
                        punchOut
                    });
                }
            }
        }

        res.status(200).json({ message: "Random attendance data generated successfully" });
    } catch (e) {
        onCatchError(e, res);
    }
};
