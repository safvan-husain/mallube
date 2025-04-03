import { z} from 'zod';
import {ICustomRequest, TypedResponse} from "../../../types/requestion";
import {onCatchError, internalRunTimeResponseValidation} from "../../service/serviceContoller";
import {istFromStringOrNumberSchema, phoneZodValidation} from "../../../schemas/commom.schema";
import Manager, {TManager} from "../../../models/managerModel";
import { Types } from 'mongoose';
import bcrypt from "bcryptjs";

const managerMinimalResponse = z.object({
    _id: z.instanceof(Types.ObjectId),
    username: z.string(),
    city: z.string(),
    district: z.string(),
    phone: z.string()
})

type ManagerMinimal = z.infer<typeof managerMinimalResponse>;

export const createManager = async (req: ICustomRequest<any>, res: TypedResponse<ManagerMinimal>) => {
    try {
        const data = z.object({
            name: z.string(),
            username: z.string(),
            address: z.string(),
            place: z.string(),
            city: z.string(),
            district: z.string(),
            aadharNumber: z.string(),
            phone: phoneZodValidation,
            companyPhone: phoneZodValidation,
            workAreaName: z.string(),
            joinedDate: istFromStringOrNumberSchema,
        }).parse(req.body);

        const managerExist = await Manager.findOne({ $or: [{ username: data.username }, { phone: data.phone }]});
        if(managerExist) {
            res.status(400).json({ message: "Manager already exist"});
            return;
        }
        const manager = await Manager.create<TManager>({
            ...data,
            isActive: true
        });
        let response = internalRunTimeResponseValidation(managerMinimalResponse, manager);
        if(response.error != null) {
            res.status(500).json(response.error)
            return;
        }
        res.status(200).json(response.data);
    } catch (e) {
        onCatchError(e, res);
    }
}

export const loginManager = async (req: Request, res: TypedResponse<{ token?: string, username: string, mustChangePassword: boolean }>) => {
    try {
        const requestData = z.object({
            username: z.string(),
            password: z.string()
        }).parse(req.body);
        const manager = await Manager.findOne({ username: requestData.username }, { password: 1});
        if(!manager) {
            res.status(400).json({ message: "Manager not found"});
            return;
        }
        if(manager.hashedPassword) {
            const isMatch = await bcrypt.compare(requestData.password, manager.hashedPassword);
            if(!isMatch) {
                res.status(400).json({message: "Invalid password"});
                return;
            } else {
                const token = manager.generateAuthToken();
                res.status(200).json({token, username: manager.username, mustChangePassword: false });
                return;
            }
        }
        res.status(200).json({ username: manager.username, mustChangePassword: true });
    } catch (e) {
        onCatchError(e, res);
    }
}