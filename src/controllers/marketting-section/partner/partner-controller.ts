import {Request, Response} from "express";
import {TypedResponse} from "../../../types/requestion";
import {
    EmployeeBusinessListItem,
    employeeBusinessListItems,
    EmployeeBusinessListItemSchema
} from "../../store/validation/store_validation";
import {
    changePasswordRequestSchema,
    createPartnerSchema, fcmTokenRequestSchema, loginPartnerResponseSchema,
    loginPartnerSchema, monthAndBusinessTypeSchema,
    partnerResponseSchema,
    partnerStoreListQuerySchema
} from "../validations";
import {FilterQuery} from "mongoose";
import {IStore} from "../../../models/storeModel";
import {
    getCreatedAtFilterFromDateRange,
    getUTCMonthRangeFromISTDate,
    ObjectIdSchema
} from "../../../schemas/commom.schema";
import {businessListFromQuery} from "../../../service/marketting/business-list-from-query";
import {onCatchError} from "../../../error/onCatchError";
import { Partner } from "../../../models/Partner";
import {runtimeValidation} from "../../../error/runtimeValidation";
import {generateToken} from "../../../config/jwt";
import {pushNotifcationStatusSchema} from "../../../schemas/user.schema";

export const getBusinesses = async (req: Request, res: TypedResponse<EmployeeBusinessListItem[]>) => {
    try {
        const query = partnerStoreListQuerySchema
            .parse(req.query)

        const dbQuery: FilterQuery<IStore> = {};

        dbQuery.type = query.businessType;

        const createdAt = getCreatedAtFilterFromDateRange(query);
        if (createdAt) dbQuery.createdAt = createdAt;

        if (query.searchTerm) {
            const regex = {$regex: query.searchTerm.trim(), $options: "i"}
            dbQuery.$or = [
                {storeName: regex},
                {storeOwnerName: regex},
            ]
        }

        console.log("query here", dbQuery);

        // res.status(200).json(await businessListFromQuery({ query: dbQuery, skip: query.skip, limit: query.limit }));
        res.status(200).json(runtimeValidation(EmployeeBusinessListItemSchema,employeeBusinessListItems));
    } catch (e) {
        onCatchError(e, res);
    }
}

export const getJoinedStoreCount = async (req: Request, res: TypedResponse<any>) => {
    try {
        const {month} = monthAndBusinessTypeSchema.parse(req.query);
        res.status(200).json([
            {
                date: (new Date('2023-04-01')).getTime(),
                count: 6
            }, {
                date: (new Date('2023-04-02')).getTime(),
                count: 2
            },
            {
                date: (new Date('2023-04-04')).getTime(),
                count: 8
            }, {
                date: (new Date('2023-04-05')).getTime(),
                count: 1
            },
        ])
    } catch (e) {
        onCatchError(e, res);
    }
}

export const createPartner = async (req: Request, res: TypedResponse<any>) => {
    try {
        const data = createPartnerSchema.parse(req.body);
        // Check if user already exists by phone number
        const existingUser = await Partner.findOne({ phone: data.phone });
        if (existingUser) {
            return res.status(409).json({ message: 'Partner with this phone number already exists.' });
        }
        // Create new partner
        const newUser = await Partner.create(data);
        return res.status(201).json(runtimeValidation(partnerResponseSchema, {
            _id: newUser._id.toString(),
            ...data
        }));
    } catch (e) {
        onCatchError(e, res);
    }
}

export const updatePartner = async (req: Request, res: TypedResponse<any>) => {
    try {
        const data = createPartnerSchema.partial().parse(req.body);
        const { id } = ObjectIdSchema.parse(req.params.id);
        const updatedPartner = await Partner.findByIdAndUpdate(id, data, { new: true });
        if (!updatedPartner) {
            return res.status(404).json({ message: 'Partner not found.' });
        }
        return res.status(200).json(runtimeValidation(partnerResponseSchema, {...updatedPartner, _id: updatedPartner._id.toString()}));
    } catch (e) {
        onCatchError(e, res);
    }
};

export const loginPartner = async (req: Request, res: TypedResponse<any>) => {
    try {
        const data = loginPartnerSchema.parse(req.body);

        const user = await Partner.findOne({ phone: data.phone });
        if (!user) {
            return res.status(404).json({ message: 'Partner not found.' });
        }

        if(!await user.comparePassword(data.password)) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }
        if (data.fcmToken) {
            user.fcmToken = data.fcmToken;
            await user.save();
        }
        // Generate JWT token
        const token = generateToken({ _id: user._id.toString() });

        return res.status(200).json(runtimeValidation(loginPartnerResponseSchema, {
            _id: user._id.toString(),
            phone: user.phone,
            name: user.name,
            token,
        }));
    } catch (e) {
        onCatchError(e, res);
    }
};

export const getAllPartners = async (req: Request, res: TypedResponse<any>) => {
    try {
        const partners = await Partner
            .find({}, { pushNotificationStatus: 0 })
            .lean<{name: string, phone: string, address: string, district: string, place: string}[]>();
        return res.status(200).json(partners);
    } catch (e) {
        onCatchError(e, res);
    }
};

export const businessGraph = async (req: Request, res: Response) => {
    try {
        const {month} = monthAndBusinessTypeSchema.parse(req.query);
        const range = getUTCMonthRangeFromISTDate(month);

        // Get all days in the month
        const allDays = [];
        let currentDate = new Date(range.start);
        while (currentDate < range.end) {
            allDays.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }
        //TODO: correct calculations.
        const data = allDays.map(e => ({
            day: e.getDate().toString().padStart(2, '0'),
            count: Math.floor(Math.random() * 100),
        }));
        res.status(200).json(data);
    } catch (e) {
        onCatchError(e, res);
    }
}

export const updateFcmToken = async (req: Request, res: TypedResponse<any>) => {
    try {
        const { fcmToken } = fcmTokenRequestSchema.parse(req.body);
        await Partner.findByIdAndUpdate(req.partner._id, { fcmToken });
        return res.status(200).json({ message: 'fcmToken updated successfully' });
    } catch (e) {
        onCatchError(e, res);
    }
};

export const changePassword = async (req: Request, res: TypedResponse<any>) => {
    try {
        const { password } = changePasswordRequestSchema.parse(req.body);
        await Partner.findByIdAndUpdate(req.partner._id,{ password });
        return res.status(200).json({ message: 'Password reset successfully' });
    } catch (e) {
        onCatchError(e, res);
    }
};

export const updatePushNotificationStatus = async (req: Request, res: TypedResponse<any>) => {
    try {
        const data = pushNotifcationStatusSchema.parse(req.body);
        await Partner.findByIdAndUpdate(req.partner._id, data);
        return res.status(200).json({ message: 'Push notification status updated successfully' });
    } catch (e) {
        onCatchError(e, res);
    }
};
