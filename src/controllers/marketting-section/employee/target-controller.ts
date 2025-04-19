import { Request} from 'express';
import {Router} from 'express';
import {TypedResponse} from "../../../types/requestion";
import {onCatchError} from "../../service/serviceContoller";
import {monthSchema} from "../validations";
import {z} from "zod";

const attendanceRecord = z.object({
    date: z.number(),
    present: z.number(),
    absent: z.number()
})

type AttendanceRecord = z.infer<typeof attendanceRecord>;

const router = Router();

const getAttendanceListForMonth = async (req: Request, res: TypedResponse<any>) => {
    try {
        const month = monthSchema.parse(req.query);
    } catch (e) {
        onCatchError(e, res);
    }
}