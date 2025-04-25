
import { Request, Response } from 'express';
import { z } from 'zod';
import { onCatchError } from '../service/serviceContoller';
import User from '../../models/userModel';
import Store from '../../models/storeModel';
import Employee from '../../models/managerModel';

export const getTokens = async (req: Request, res: Response) => {
    try {
        const query = z.object({
            type: z.enum(['store', 'employee', 'user']).default('employee'),
            quantity: z.enum(['five', 'all']).default('five')
        }).parse(req.query);

        const limit = query.quantity === 'five' ? 5 : 0;

        let result: any[] = [];

        if (query.type === 'user') {
            const usersQuery = User.find({}, { fullName: 1 });
            if (limit) usersQuery.limit(limit);

            const users = await usersQuery;
            result = users.map(user => ({
                id: user._id,
                name: user.fullName,
                token: user.generateAuthToken()
            }));

        } else if (query.type === 'store') {
            const storesQuery = Store.find({}, { storeName: 1 });
            if (limit) storesQuery.limit(limit);

            const stores = await storesQuery;
            result = stores.map(store => ({
                id: store._id,
                name: store.storeName,
                token: store.generateAuthToken()
            }));

        } else if (query.type === 'employee') {
            const employeesQuery = Employee
                .find({}, { username: 1, privilege: 1 })
                .populate<{ manager?: { username: string }}>('manager', 'username');

            if (limit) employeesQuery.limit(limit);

            const employees = await employeesQuery;
            result = employees.map(emp => ({
                id: emp._id,
                name: emp.username,
                privilege: emp.privilege,
                token: emp.generateAuthToken(),
                manager: emp.manager?.username
            }));
        }

        res.status(200).json({ data: result });
    } catch (e) {
        onCatchError(e, res);
    }
};
