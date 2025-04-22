import mongoose, {Document} from 'mongoose';

export interface ITarget extends Document {
    month?: Date;
    day?: Date;
    assigned: mongoose.Types.ObjectId;
    total: number;
    achieved: number;
}

const TargetSchema = new mongoose.Schema(
    {
        assigned: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Employee',
            required: true,
        },
        month: {type: Date,},
        day: {type: Date,},
        total: {type: Number, required: true,},
        achieved: {type: Number, default: 0,},
    },
    {
        timestamps: true,
    }
);

// Static method to set target for an employee for a specific month
TargetSchema.statics.setTarget = async function (
    employeeId: mongoose.Types.ObjectId,
    range: "day" | "month",
    target: number
) {
    const currentDate = new Date();
    let day: number = 1;
    if (range === 'day') {
        day = currentDate.getDate();
    }
    // Normalize the month to the first day of month and ignore time
    const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);

    // Find or create the target
    const existingTarget = await this.findOne({
        assigned: employeeId,
        month: targetDate
    });

    if (existingTarget) {
        existingTarget.total = target;
        return existingTarget.save();
    }

    return this.create({
        assigned: employeeId,
        month: targetDate,
        total: target,
        achieved: 0
    });
};

// Static method to record target achievement
TargetSchema.statics.achieveTarget = async function (
    employeeId: mongoose.Types.ObjectId,
): Promise<void> {
    const currentDate = new Date();
    const currentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const currentDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());

    // Find or create the target for current month
    let target = await this.findOne({
        assigned: employeeId,
        month: currentMonth
    });
    let dayTarget = await this.findOne({
        assigned: employeeId,
        day: currentDay
    })

    if(!dayTarget) {
        await this.create({
            assigned: employeeId,
            day: currentDay,
            total: 0,
            achieved: 1,
        })
    } else {
        dayTarget.achieved += 1;
        await dayTarget.save();
    }

    if (!target) {
        // If no target exists, create one with the achievement as both total and achieved
        await this.create({
            assigned: employeeId,
            month: currentMonth,
            total: 0,
            achieved: 1,
        });
    } else {
        // If target exists, increment the achieved amount
        target.achieved += 1;
        await target.save();
    }
};

interface TargetModel extends mongoose.Model<ITarget> {
    setTarget(
        employeeId: mongoose.Types.ObjectId,
        range: "day" | "month",
        target: number
    ): Promise<ITarget>;

    achieveTarget(
        employeeId: mongoose.Types.ObjectId,
    ): Promise<ITarget>;
    
    getTargetsByDateAndRange(
        date: Date,
        range: "day" | "month",
        staffIds: mongoose.Types.ObjectId[]
    ): Promise<{ date: number; count: number; target: number; }[]>;
}

// Static method to get targets for specific date range and staff
TargetSchema.statics.getTargetsByDateAndRange = async function(
    date: Date,
    range: "day" | "month",
    staffIds: mongoose.Types.ObjectId[]
) {
    const startDate = new Date(date.getFullYear(), date.getMonth(), range === "day" ? date.getDate() : 1);
    const endDate = new Date(startDate);
    if (range === "month") {
        endDate.setMonth(endDate.getMonth() + 1);
    } else {
        endDate.setDate(endDate.getDate() + 1);
    }

    const targets = await this.aggregate([
        {
            $match: {
                assigned: { $in: staffIds },
                [range]: {
                    $gte: startDate,
                    $lt: endDate
                }
            }
        },
        {
            $group: {
                _id: "$assigned",
                totalTarget: { $sum: "$total" },
                achieved: { $sum: "$achieved" }
            }
        }
    ]);

    return [{
        date: startDate.getTime(),
        count: targets.reduce((sum, curr) => sum + curr.achieved, 0),
        target: targets.reduce((sum, curr) => sum + curr.totalTarget, 0)
    }];
};

const Target = mongoose.model<ITarget, TargetModel>('Target', TargetSchema);

export default Target;