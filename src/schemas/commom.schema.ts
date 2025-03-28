import {z} from "zod";
import {Types} from "mongoose";

export const phoneZodValidation = z.string().min(10, { message: "phone should exactly 10 numbers"}).regex(/^\d+$/, { message: "phone should contain only numbers"} );
export const ObjectIdSchema = z
    .string()
    .refine((v) => Types.ObjectId.isValid(v), { message: "Invalid ObjectId" });

export const paginationSchema = z.object({
    skip: z.string().optional().transform(val => val ? parseInt(val) : 0),
    limit: z.string().optional().transform(val => val ? parseInt(val) : 20)
})

function transformDate(val: string | number ): Date {
    const millisecondInIst = typeof val === "number" ? val : parseInt(val);
    return new Date(millisecondInIst);
}

export const istFromStringOrNumberSchema = z.union([z.string(), z.number()])
    .refine(val => typeof val === "number" || /^-?\d+$/.test(val.toString()), {
        message: "should be milliseconds since epoch"
    })
    .transform(transformDate);

export const dateFiltersSchema = z.object({
    startDate: istFromStringOrNumberSchema.transform(date => {
        if (!date) return undefined;

        const startOfDay = new Date(date);
        startOfDay.setUTCHours(0, 0, 0, 0);
        return startOfDay;
    }),
    endDate: istFromStringOrNumberSchema.transform((date: Date | undefined): Date | undefined => {
        if (!date) return undefined;

        const endOfDay = new Date(date);
        endOfDay.setUTCHours(23, 59, 59, 999);
        return endOfDay;
    }),
});
