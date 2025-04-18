import {NextFunction, Request, Response} from "express";
import {ICustomRequest, TypedResponse} from "../../types/requestion";
import Store from "../../models/storeModel";
import bcrypt from "bcryptjs";
import {z} from "zod";
import {onCatchError} from "../service/serviceContoller";
import jwt, {JsonWebTokenError} from "jsonwebtoken";
import User from "../../models/userModel";

export const changeStorePasswordV2 = async (
    req: ICustomRequest<any>,
    res: TypedResponse<undefined>,
) => {
    try {
        const { password, hash } = z.object({
            password: z.string().min(6, { message: "password should contain min 6 characters"}),
            hash: z.string()
        }).parse(req.body);

        const decoded: { phone: string } = jwt.verify(hash, 'otp-secret') as any;

        if(!decoded.phone) {
            res.status(400).json({  message: "invalid token" });
            return;
        }

        const hashPassword = await bcrypt.hash(password, 10);

        const response = await Store.findOneAndUpdate({ phone: decoded.phone }, { password: hashPassword});
        if(!response) {
            res.status(404).json({ message: "Store not found" });
            return;
        }
        res.status(200).json({ message: "Password updated successfully"});
    } catch (error) {
        if(error instanceof JsonWebTokenError) {
            res.status(400).json({ message: "invalid hash" });
            return;
        }
        onCatchError(error, res);
    }
};

export const changeStorePushNotificationStatus = async (req: ICustomRequest<any>, res: Response) => {
    const {status} = z.object({
        status: z.boolean()
    }).parse(req.body);
    try {
        const userId = req.store?._id;
        if(!userId) {
            res.status(400).json({message: "Invalid user id"});
            return;
        }
        const user = await Store.findByIdAndUpdate(userId, {isPushNotificationEnabled: status})
        if(!user) {
            res.status(404).json({message: "Store not found"});
            return;
        }
        res.status(200).json({message: "Success"});
    } catch (error) {
        onCatchError(error, res);
    }
};

