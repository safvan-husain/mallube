import asyncHandler from "express-async-handler";
import {Request, Response} from "express";
import {ICustomRequest, TypedResponse} from "../../types/requestion";
import {Customer} from "../../models/customerModel";
import {CustomerBill} from "../../models/customerBillModel";
import {formatLastPurchaseDate, getIST} from "../../utils/ist_time";
import {z} from "zod";
import {ObjectIdSchema} from "../../types/validation";
import {onCatchError, runtimeValidation} from "../service/serviceContoller";
import {Types} from "mongoose";
import {
    CustomerResponse,
    CustomerResponseSchema,
    deleteCustomersSchema,
    updateCustomerSchema
} from "./validation/pattu-book-validations";


export const createCustomer = asyncHandler(
    async (req: ICustomRequest<any>, res: Response) => {
        try {
            const {name, contact} = req.body;
            const existingCustomer = await Customer.findOne({contact, customerId: req.store?._id});
            if (existingCustomer) {
                res.status(401).json({message: "Customer already exist with same contact"});
                return;
            }
            const storeId = req.store?._id;
            var customer = new Customer(
                {
                    name,
                    contact,
                    storeId
                }
            );
            customer = await customer.save();
            res.status(201).json({
                _id: customer._id,
                name: customer.name,
                contact: customer.contact,
                totalAmount: 0,
                lastPurchase: 'just created',

            });
        } catch (error) {
            console.log("error ", error);
            res.status(500).json({message: "Internal server error"})
        }
    }
)

export const getAllCustomers = asyncHandler(
    async (req: ICustomRequest<any>, res: TypedResponse<CustomerResponse[]>) => {
        try {
            const storeId = req.store?._id;
            const tempCustomers = await Customer.find({storeId}, {name: 1, contact: 1, _id: 1}).lean<{ name: string, contact: string, _id: Types.ObjectId}[]>();
            let customers: CustomerResponse[] = [];
            for (const customer of tempCustomers) {
                const purchaseHistory = await CustomerBill.aggregate([
                    {
                        $match: {
                            customerId: customer._id,
                        },

                    },
                    {
                        $group: {
                            _id: null,
                            totalAmount: {$sum: "$totalAmount"},
                            lastPurchaseDate: {$max: "$createdAt"}
                        }
                    }
                ]);

                if (purchaseHistory.length > 0) {
                    customers.push({
                        name: customer.name,
                        contact: customer.contact,
                        _id: customer._id,
                        totalAmount: purchaseHistory[0].totalAmount,
                        lastPurchase: purchaseHistory[0].lastPurchaseDate ? formatLastPurchaseDate(purchaseHistory[0].lastPurchaseDate) : "none",
                    });
                } else {
                    customers.push({
                        name: customer.name,
                        contact: customer.contact,
                        _id: customer._id, totalAmount: 0,
                        lastPurchase: 'not purchased yet',
                    });
                }
            }
            res.status(200).json(runtimeValidation(CustomerResponseSchema, customers));
        } catch (error) {
            onCatchError(error, res);
        }
    }
)

export const updateCustomer = asyncHandler(
    async (req: ICustomRequest<any>, res: Response) => {
        try {
            const {id, name, contact} = updateCustomerSchema.parse(req.body);
            let customer = await Customer
                .findByIdAndUpdate(id, {name, contact}, {new: true})
                .lean<{ name: string, contact: string, _id: Types.ObjectId}>();

            if(!customer) {
                res.status(404).json({message: "Customer not found"});
                return;
            }
            res.status(200).json(runtimeValidation(CustomerResponseSchema, {...customer, lastPurchase: '', totalAmount: 0}));
        } catch (error) {
            onCatchError(error, res);
        }
    }
)

export const deleteCustomer = asyncHandler(
    async (req: ICustomRequest<any>, res: Response) => {
        try {
            const {customerIds} = deleteCustomersSchema.parse(req.body);
            let deleteItems = await Customer.deleteMany({_id: {$in: customerIds}});
            await CustomerBill.deleteMany({customerId: {$in: customerIds}});
            if(!deleteItems) {
                res.status(404).json({message: "Customer not found"});
                return;
            }
            res.status(200).json({message: "success"});
        } catch (error) {
            onCatchError(error, res);
        }
    }
)

interface CustomerBillResponse {
    _id: string;
    customerId: string;
    items: any[];
    totalAmount: number;
    date: number;
    billPhotoUrl?: string
}

export const createBillForCustomer = asyncHandler(
    async (req: ICustomRequest<any>,
           res: TypedResponse<CustomerBillResponse>) => {
        try {
            const {customerId, items, totalAmount, date, billPhotoUrl} = z.object({
                customerId: ObjectIdSchema,
                items: z.array(z.any()),
                totalAmount: z.number(),
                date: z.number(),
                billPhotoUrl: z.string().url()
            }).parse(req.body);
            let new_bill = new CustomerBill({
                customerId,
                items,
                totalAmount,
                date: new Date(date),
                billPhotoUrl,
            });
            new_bill = await new_bill.save();
            res.status(201).json({
                ...new_bill.toObject(),
                _id: new_bill._id.toString(),
                customerId: new_bill.customerId.toString(),
                date: new_bill.date.getTime()
            });
        } catch (error) {
            onCatchError(error, res);
        }
    }
)

export const markRecievedPayment = asyncHandler(
    async (req: ICustomRequest<any>, res: Response) => {
        try {
            const {customerId, amount, date} = req.body;
            const new_bill = new CustomerBill({
                customerId,
                items: [],
                totalAmount: -amount,
                date: new Date(date)
            });
            await new_bill.save();
            res.status(201).json({message: "Success"});
        } catch (error) {
            console.log("error ", error);
            res.status(500).json({message: "Internal server error"})
        }
    }
)

export const getCustomerPurchaseHistory = asyncHandler(
    async (req: ICustomRequest<any>, res: TypedResponse<{
        totalPending: number,
        bills: {
            _id: string;
            amount: number;
            date: string;
            billPhotoUrl?: string
        }[]
    }>) => {
        try {
            const customerId = ObjectIdSchema.parse(req.query.customerId);
            const tempBills = await CustomerBill.find({customerId}, {
                _id: 1,
                totalAmount: 1,
                date: 1,
                billPhotoUrl: true
            })
            let bills: any[] = [];
            let totalPending = 0;
            for (const bill of tempBills) {
                totalPending += bill.totalAmount;
                bills.push({
                    _id: bill._id,
                    amount: bill.totalAmount,
                    date: bill.date.toDateString(),
                    billPhotoUrl: bill.billPhotoUrl
                });
            }
            res.status(200).json({
                totalPending,
                bills
            });
        } catch (error) {
            onCatchError(error, res);
        }
    }
)

export const getSpecificBill = asyncHandler(
    async (req: ICustomRequest<any>, res: TypedResponse<CustomerBillResponse>) => {
        try {
            const billId = ObjectIdSchema.parse(req.query.billId);
            const bill = await CustomerBill.findById(billId, {
                _id: true,
                date: true,
                items: true,
                totalAmount: true,
                customerId: true,
                billPhotoUrl: true
            }).lean()

            if (!bill) {
                res.status(404).json({message: "Bill not found"});
                return;
            }
            res.status(200).json(bill.toObject());
        } catch (error) {
            onCatchError(error, res);
        }
    }
)

export const updateSpecificBill = asyncHandler(
    async (req: ICustomRequest<any>, res: TypedResponse<CustomerBillResponse>) => {
        try {
            const {items, totalAmount, id, date} = z.object({
                items: z.array(z.any()),
                totalAmount: z.number(),
                id: ObjectIdSchema,
                date: z.number(),
                billPhotoUrl: z.string().url()
            }).partial().parse(req.body);

            await CustomerBill.findByIdAndUpdate(id, {items, totalAmount, date:date ?  new Date(date) : undefined});
            const bill = await CustomerBill.findById(id, {
                _id: true,
                date: true,
                items: true,
                totalAmount: true,
                customerId: true,
                billPhotoUrl: true
            }).lean();

            if(!bill) {
                res.status(404).json({message: "Bill not found"});
                return;
            }
            res.status(200).json(bill.toObject());
        } catch (error) {
            onCatchError(error, res);
        }
    }
)

export const deleteSelectedBills = asyncHandler(
    async (req: ICustomRequest<any>, res: Response) => {
        try {
            const {billIds} = z.object({
                billIds: z.array(ObjectIdSchema)
            }).parse(req.body);
            const bills = await CustomerBill.deleteMany({_id: {$in: billIds}});
            if(!bills) {
                res.status(404).json({message: "Bill not found"});
                return;
            }
            res.status(200).json({message: "Deleted Successfully"});
        } catch (error) {
            onCatchError(error, res);
        }
    }
)