import {z} from "zod";
import {Types} from "mongoose";
import {allRangeOfDateSchema} from "../controllers/marketting-section/validations";

export const phoneZodValidation = z.string().min(10, {message: "phone should exactly 10 numbers"}).regex(/^\d+$/, {message: "phone should contain only numbers"});
export const ObjectIdSchema = z
    .string()
    .refine((v) => Types.ObjectId.isValid(v), {message: "Invalid ObjectId"}).transform(e => Types.ObjectId.createFromHexString(e));

export const paginationSchema = z.object({
    skip: z.string().optional().transform(val => val ? parseInt(val) : 0),
    limit: z.string().optional().transform(val => val ? parseInt(val) : 20)
})

function transformDate(val: string | number): Date {
    const millisecondInIst = typeof val === "number" ? val : parseInt(val);
    return new Date(millisecondInIst);
}

export const istFromStringOrNumberSchema = z.union([z.string(), z.number()])
    .refine(val => typeof val === "number" || /^-?\d+$/.test(val.toString()), {
        message: "should be milliseconds since epoch"
    })
    .transform(transformDate);

export const optionalDateFiltersSchema = z.object({
    startDate: istFromStringOrNumberSchema.optional().transform(date => {
        if (!date) return undefined;

        const startOfDay = new Date(date);
        startOfDay.setUTCHours(0, 0, 0, 0);
        return startOfDay;
    }),
    endDate: istFromStringOrNumberSchema.optional().transform((date: Date | undefined): Date | undefined => {
        if (!date) return undefined;

        const endOfDay = new Date(date);
        endOfDay.setUTCHours(23, 59, 59, 999);
        return endOfDay;
    }),
});

export const zodObjectForMDObjectId = z.object({
    id: ObjectIdSchema
});

export function getUTCMonthRangeFromISTDate(istDate: Date): { start: Date; end: Date } {
    // Convert IST to UTC (IST = UTC + 5:30, so subtract offset to get UTC)
    const utcTime = istDate.getTime() - (5.5 * 60 * 60 * 1000);
    const utcDate = new Date(utcTime);

    // Start of month in UTC (first day, 00:00:00)
    const utcStart = new Date(Date.UTC(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), 1));

    // End of month in UTC (last day, 23:59:59.999)
    const utcEnd = new Date(Date.UTC(utcDate.getUTCFullYear(), utcDate.getUTCMonth() + 1, 0, 23, 59, 59, 999));

    return { start: utcStart, end: utcEnd };
}


export function getUTCDayRangeFromISTDate(istDate: Date): { start: Date; end: Date } {
    // Add 5.5 hours to convert IST to UTC (since IST is UTC+5:30)
    const utcTime = istDate.getTime() + (5.5 * 60 * 60 * 1000);

    // Extract UTC Y/M/D
    const utcDate = new Date(utcTime);
    const year = utcDate.getUTCFullYear();
    const month = utcDate.getUTCMonth();
    const day = utcDate.getUTCDate();

    // Start of day in UTC
    const utcStart = new Date(Date.UTC(year, month, day));

    // End of day in UTC (last millisecond)
    const utcEnd = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));

    return { start: utcStart, end: utcEnd };
}

export function getCreatedAtFilterFromDateRange(input: z.infer<typeof allRangeOfDateSchema>) {

    if (input.month) {
        const {start, end} = getUTCMonthRangeFromISTDate(input.month);
        return {
            $gte: start,
            $lt: end,
        };
    }

    if (input.day) {
        console.log(`today : ${new Date(input.day)}`);
        const {start, end} = getUTCDayRangeFromISTDate(input.day);
        return {
            $gte: start,
            $lt: end,
        };
    }

    if (input.startDate && input.endDate) {
        const start = new Date(input.startDate.getTime() - (5.5 * 60 * 60 * 1000));
        const end = new Date(input.endDate.getTime() - (5.5 * 60 * 60 * 1000) + 1); // to include full end date

        return {
            $gte: start,
            $lt: end,
        };
    }

    return undefined; // No filter
}

