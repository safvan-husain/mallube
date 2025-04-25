import {NextFunction, Request, Response} from "express";
import {ICustomRequest, TypedResponse} from "../../types/requestion";
import {z} from "zod";
import jwt from "jsonwebtoken";
import {phoneZodValidation} from "../../schemas/commom.schema";
import {onCatchError} from "../../error/onCatchError";

//TODO: otp-secret.
export const otpVerifyV2 = async (req: Request, res: Response) => {
    try {
        const { hash, otp } = z.object({
            hash: z.string(),
            otp: z.string().min(4, { message: "otp should be 4 char"})
        }).parse(req.body);

        const decoded: { phone: string, otp: string} = jwt.verify(hash, 'otp-secret') as any;
        if(decoded.otp === otp) {
            res.status(200).json({ message: "OTP verified successfully" });
        } else {
            res.status(400).json({ message: "OTP is wrong" });
        }
    } catch (error) {
        onCatchError(error, res);
    }
};

export const sendOtpV2 = async (req: Request, res: TypedResponse<{ message: string, hash: string }>) => {
    try {
        const { phone } = z.object({
            phone: phoneZodValidation
        }).parse(req.body);

        let hash = jwt.sign({ phone, otp: "0000" }, "otp-secret", { expiresIn: "1d"})
        res.status(200).json({ message: `OTP sent successfully to +91 ${phone}`, hash });
    } catch (e) {
        onCatchError(e, res);
    }
}