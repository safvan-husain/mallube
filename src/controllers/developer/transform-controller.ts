
import expressAsyncHandler from "express-async-handler";
import {Request, Response} from "express";
import Employee from "../../models/managerModel";
import {onCatchError} from "../service/serviceContoller";

export const updateData = expressAsyncHandler(
    async (req: Request, res: Response) => {
        try {
            let data = await Employee.updateMany({ dayTarget: { $exists: false}}, {
                dayTarget: 5,
                monthTarget: 10
            });
            res.status(200).json(data);
        } catch (error) {
            console.log(error)
            res.status(400).json({message: error})
        }
    }
);
