import mongoose, {Document} from 'mongoose';
import {AppError} from "../controllers/service/requestValidationTypes";

export interface IAttendance extends Document {
    assigned: mongoose.Types.ObjectId;
    punchIn: Date;
    punchOut?: Date;
}

const AttendanceSchema = new mongoose.Schema(
    {
        assigned: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Employee',
            required: true,
        },
        punchIn: {
            type: Date,
            required: true,
        },
        punchOut: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// Static method for an employee to punch in
AttendanceSchema.statics.punchIn = async function(
    employeeId: mongoose.Types.ObjectId
) {
    const currentDate = new Date();

    // Check if there's already an open attendance record for today
    const startOfDay = new Date(currentDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(currentDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAttendance = await this.findOne({
        assigned: employeeId,
        punchIn: { $gte: startOfDay, $lte: endOfDay },
        punchOut: null
    });

    if (existingAttendance) {
        return existingAttendance; // Already punched in
    }

    // Create new attendance record with punch in
    return this.create({
        assigned: employeeId,
        punchIn: currentDate
    });
};

// Static method for an employee to punch out
AttendanceSchema.statics.punchOut = async function(
    employeeId: mongoose.Types.ObjectId
) {
    const currentDate = new Date();

    // Find the most recent punch in without punch out
    const startOfDay = new Date(currentDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(currentDate);
    endOfDay.setHours(23, 59, 59, 999);

    const attendance = await this.findOne({
        assigned: employeeId,
        punchIn: { $gte: startOfDay, $lte: endOfDay },
        punchOut: null
    });

    if (!attendance) {
        throw new AppError('No active attendance record found. Please punch in first.', 401);
    }

    // Update the record with punch out time
    attendance.punchOut = currentDate;
    return attendance.save();
};

interface AttendanceModel extends mongoose.Model<IAttendance> {
    punchIn(
        employeeId: mongoose.Types.ObjectId
    ): Promise<IAttendance>;

    punchOut(
        employeeId: mongoose.Types.ObjectId
    ): Promise<IAttendance>;
}

const Attendance = mongoose.model<IAttendance, AttendanceModel>('Attendance', AttendanceSchema);

export default Attendance;