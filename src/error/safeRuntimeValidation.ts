import {z} from "zod";
import {logger} from "../config/logger";

export const safeRuntimeValidation = <T>(schema: z.ZodSchema<T>, data: T)
    : ({ data: T; error: null } | { data: null; error: { message: string; errors?: any } }) => {
    try {
        return {data: schema.parse(data), error: null};
    } catch (e) {
        logger.error(e);
        if (e instanceof z.ZodError) {
            return {
                data: null,
                error: {
                    message: e.errors.length > 0 ? `${e.errors[0].path[0]}: ${e.errors[0].message} while validating response` : "Response error",
                    errors: e.errors
                }
            };
        } else {
            console.error("Unexpected error:", e);
            return {
                data: null,
                error: {message: "Internal server error"}
            }
        }
    }
};