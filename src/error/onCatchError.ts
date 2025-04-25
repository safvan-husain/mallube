import {Response} from "express";
import {z} from "zod";
import {AppError} from "../controllers/service/requestValidationTypes";
import {logger} from "../config/logger";

export const onCatchError = (error: any, res: Response) => {
    if (error instanceof z.ZodError) {
        res.status(400).json({
            message: error.errors.length > 0 ? `${error.errors[0].path[0]}: ${error.errors[0].message}` : "Validation error",
            errors: error.errors
        });
        return;
    }
    if (error instanceof AppError) {
        res.status(error.statusCode).json(error.toJson());
        return;
    }
    logger.error(error);
    res.status(500).json({message: "Internal server error", error});
}