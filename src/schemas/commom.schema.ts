import {z} from "zod";
import {Types} from "mongoose";
import {allRangeOfDateSchema} from "../controllers/marketting-section/validations";

export const phoneZodValidation = z.string().min(10, {message: "phone should exactly 10 numbers"}).regex(/^\d+$/, {message: "phone should contain only numbers"});
export const ObjectIdSchema = z
    .string()
    .refine((v) => Types.ObjectId.isValid(v), {message: "Invalid ObjectId"}).transform(e => e ? Types.ObjectId.createFromHexString(e) : undefined);

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

export function getMonthRangeFromISTDate(istDate: Date): { start: Date; end: Date } {
    // Convert IST to UTC manually (IST is UTC+5:30)
    const utcDate = new Date(istDate.getTime() - (5.5 * 60 * 60 * 1000));

    // First day of the month in UTC
    const utcStart = new Date(Date.UTC(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), 1));

    // First day of next month in UTC
    const utcEnd = new Date(Date.UTC(utcDate.getUTCFullYear(), utcDate.getUTCMonth() + 1, 1));

    return {start: utcStart, end: utcEnd};
}

export function getDayRangeFromISTDate(istDate: Date): { start: Date; end: Date } {
    // Convert IST to UTC (IST = UTC + 5:30)
    const utcDate = new Date(istDate.getTime() - (5.5 * 60 * 60 * 1000));

    // Extract UTC Y/M/D from adjusted UTC date
    const year = utcDate.getUTCFullYear();
    const month = utcDate.getUTCMonth();
    const date = utcDate.getUTCDate();

    // Start of day in UTC
    const utcStart = new Date(Date.UTC(year, month, date));

    // Start of next day in UTC
    const utcEnd = new Date(Date.UTC(year, month, date + 1));

    return {start: utcStart, end: utcEnd};
}

export function getCreatedAtFilterFromDateRange(input: z.infer<typeof allRangeOfDateSchema>) {

    if (input.month) {
        const {start, end} = getMonthRangeFromISTDate(input.month);
        return {
            $gte: start,
            $lt: end,
        };
    }

    if (input.day) {
        console.log(`today : ${new Date(input.day)}`);
        const {start, end} = getDayRangeFromISTDate(input.day);
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

