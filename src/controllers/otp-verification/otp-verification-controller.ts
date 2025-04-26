import {NextFunction, Request, Response} from "express";
import {ICustomRequest, TypedResponse} from "../../types/requestion";
import {z} from "zod";
import jwt from "jsonwebtoken";
import {phoneZodValidation} from "../../schemas/commom.schema";
import {onCatchError} from "../../error/onCatchError";
import {Partner} from "../../models/Partner";
import {generateToken} from "../../config/jwt";

const otpVerifyRequestSchema = z.object({
    hash: z.string(),
    otp: z.string().min(4, { message: "otp should be 4 char"}),
    loginType: z.enum(['user', 'business', 'partner', 'admin']).default('business')
})

//TODO: otp-secret.
export const otpVerifyV2 = async (req: Request, res: Response) => {
    try {
        const { hash, otp, loginType } = otpVerifyRequestSchema.parse(req.body);

        const decoded: { phone: string, otp: string} = jwt.verify(hash, 'otp-secret') as any;
        if(decoded.otp === otp) {
            let token;
            //TODO: implement other similar things.
            if (loginType === 'partner') {
                token = await Partner.findOne({ phone: decoded.phone }).then(e => {
                    if (!e) {
                        return undefined;
                    }
                    return generateToken({_id: e?._id.toString()});
                })
            }
            res.status(200).json({ message: "OTP verified successfully", token });
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