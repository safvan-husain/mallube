
import { Request, Response } from 'express';
import Store, { IStore } from '../../models/storeModel';
import { onCatchError } from '../service/serviceContoller';
import { Types } from 'mongoose';
import Target from "../../models/Target";

function getRandomDate(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

export const generateRandomStores = async (req: Request, res: Response) => {
  try {
    const count = Number(req.query.count) || 5;
    const type = (req.query.type as string) || 'both';
    const employeeId = req.employee!._id;

    const startDate = new Date('2025-04-01');
    const endDate = new Date();
    
    const stores: IStore[] = [];
    
    for(let i = 0; i < count; i++) {
      const isFreelancer = type === 'both' ? Math.random() > 0.5 : type === 'freelancer';
      const randomDate = getRandomDate(startDate, endDate);
      const storeData = {
        type: isFreelancer ? 'freelancer' : 'business',
        storeName: `Test Store ${i}`,
        uniqueName: `test_${Date.now()}_${i}`,
        storeOwnerName: `Test Owner ${i}`,
        address: "Test Address",
        city: "Test City",
        phone: `9${Math.floor(Math.random() * 900000000 + 100000000)}`,
        whatsapp: `9${Math.floor(Math.random() * 900000000 + 100000000)}`,
        password: "test123",
        addedBy: employeeId,
        shopImgUrl: "",
        location: {
          type: "Point",
          coordinates: [76.2673041, 9.9312328]
        },
        categories: [],
        subscriptionExpireDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdAt: randomDate
      };
      await Target.achieveTarget({ employeeId, date: randomDate });
      const store = new Store(storeData);
      await store.save();
      stores.push(store);
    }

    res.status(201).json({
      message: `Created ${stores.length} test stores`,
      stores: stores.map(s => ({
        id: s._id,
        type: s.type,
        uniqueName: s.uniqueName,
        createdAt: s.createdAt
      }))
    });
  } catch (error) {
    onCatchError(error, res);
  }
};
