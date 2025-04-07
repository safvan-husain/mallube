import {z} from 'zod';
import {ICustomRequest, TypedResponse} from "../../../types/requestion";
import {onCatchError, internalRunTimeResponseValidation} from "../../service/serviceContoller";
import {istFromStringOrNumberSchema, ObjectIdSchema, phoneZodValidation} from "../../../schemas/commom.schema";
import Manager, {TManager} from "../../../models/managerModel";
import {Types} from 'mongoose';
import bcrypt from "bcryptjs";

const managerMinimalResponse = z.object({
    _id: z.instanceof(Types.ObjectId),
    username: z.string(),
    city: z.string(),
    district: z.string(),
    phone: z.string()
})

type ManagerMinimal = z.infer<typeof managerMinimalResponse>;

const CreateManagerSchema = z.object({
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
});

export const minimalManagerResponseForAdminSchema = z.object({
    _id: z.instanceof(Types.ObjectId),
    name: z.string(),
    username: z.string(),
    isActive: z.boolean(),
    phone: z.string(),
    city: z.string(),
    district: z.string(),
    place: z.string(),
});

// Type inference (optional)
export type MinimalManagerResponseForAdmin = z.infer<typeof minimalManagerResponseForAdminSchema>;

export const createManager = async (req: ICustomRequest<any>, res: TypedResponse<MinimalManagerResponseForAdmin>) => {
    try {
        const data = CreateManagerSchema.parse(req.body);

        const managerExist = await Manager.findOne({$or: [{username: data.username}, {phone: data.phone}]});
        if (managerExist) {
            let message = "Manager already exists with ";
            if (managerExist.username === data.username && managerExist.phone === data.phone) {
                message += "both username and phone.";
            } else if (managerExist.username === data.username) {
                message += "username.";
            } else {
                message += "phone.";
            }
            res.status(400).json({message});
            return;
        }
        const manager = await Manager.create<TManager>({
            ...data,
            isActive: true
        });
        let response = internalRunTimeResponseValidation(minimalManagerResponseForAdminSchema, manager);
        if (response.error != null) {
            res.status(500).json(response.error)
            return;
        }
        res.status(200).json(response.data);
    } catch (e) {
        onCatchError(e, res);
    }
}

export const getAllManagers = async (req: ICustomRequest<any>, res: TypedResponse<MinimalManagerResponseForAdmin[]>) => {
    try {
        const managers = await Manager.find({}, {
            phone: true,
            name: true,
            username: true,
            city: true,
            district: true,
            place: true,
            isActive: true
        }).lean();

        let responseList = [];
        for (let manager of managers) {
            let response = internalRunTimeResponseValidation(minimalManagerResponseForAdminSchema, manager);
            if (response.error != null) {
                res.status(500).json(response.error)
                return;
            }
            responseList.push(response.data);
        }

        res.status(200).json(responseList);
    } catch (e) {
        onCatchError(e, res);
    }
}

export const getSpecificManagerForAdmin = async (req: ICustomRequest<any>, res: TypedResponse<any>) => {
    try {
        const { managerId } = z.object({
            managerId: ObjectIdSchema
        }).parse(req.params);

        const manager = await Manager.findById(managerId, {}).lean();
        if (!manager) {
            res.status(400).json({message: "Manager not found"});
            return;
        }
        res.status(200).json(manager);
    } catch (e) {
       onCatchError(e, res);
    }
}

export const updateManager = async (req: ICustomRequest<any>, res: TypedResponse<any>) => {
    try {
        const { id } = z.object({
            id: ObjectIdSchema
        }).parse(req.params);

        const data = CreateManagerSchema.omit({
            username: true,
            joinedDate: true,
            aadharNumber: true,
        }).partial().parse(req.body);

        const manager = await Manager.findByIdAndUpdate(id, data, {new: true}).lean();
        if (!manager) {
            res.status(400).json({message: "Manager not found"});
            return;
        }
        res.status(200).json(manager);
    } catch (e) {
        onCatchError(e, res);
    }
}

export const loginManager = async (req: Request, res: TypedResponse<{
    token?: string,
    username: string,
    mustChangePassword: boolean
}>) => {
    try {
        const requestData = z.object({
            username: z.string(),
            password: z.string()
        }).parse(req.body);
        const manager = await Manager.findOne({username: requestData.username}, {password: 1});
        if (!manager) {
            res.status(400).json({message: "Manager not found"});
            return;
        }
        if (manager.hashedPassword) {
            const isMatch = await bcrypt.compare(requestData.password, manager.hashedPassword);
            if (!isMatch) {
                res.status(400).json({message: "Invalid password"});
                return;
            } else {
                const token = manager.generateAuthToken();
                res.status(200).json({token, username: manager.username, mustChangePassword: false});
                return;
            }
        }
        res.status(200).json({username: manager.username, mustChangePassword: true});
    } catch (e) {
        onCatchError(e, res);
    }
}