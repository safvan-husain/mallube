
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const generateToken = (data: { _id: string }): string => {
    return jwt.sign(
        data,
        JWT_SECRET
    );
};

export const verifyToken = (token: string): { _id: string} | undefined => {
    try {
        return jwt.verify(token, JWT_SECRET) as any;
    } catch (error) {
        return undefined;
    }
};