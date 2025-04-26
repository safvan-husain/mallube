import { NextFunction, Request, Response } from "express";
import { verifyToken } from "../../config/jwt";
import { Partner } from "../../models/Partner";

const partnerProtect = async (req: Request, res: Response, next: NextFunction) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token provided' });
        return;
    }

    const decoded = verifyToken(token);

    if (!decoded) {
        res.status(401).json({ message: 'Not authorized, token failed' });
        return;
    }

    const partner = await Partner.findById(decoded._id).lean();

    if (!partner) {
        res.status(401).json({ message: 'Not authorized, partner not found' });
        return;
    }

    // Attach partner info to request object (optional, depending on your need)
    req.partner = partner;

    next();
};

export { partnerProtect };
