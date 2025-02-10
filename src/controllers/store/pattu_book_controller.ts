import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { ICustomRequest } from "../../types/requestion";
import { Customer } from "../../models/customerModel";
import { CustomerBill } from "../../models/customerBillModel";
import { formatLastPurchaseDate, getIST } from "../../utils/ist_time";


export const createCustomer = asyncHandler(
    async (req: ICustomRequest<any>, res: Response) => {
        try {
            const { name, contact } = req.body;
            const existingCustomer = await Customer.find({ contact });
            if (existingCustomer) {
                res.status(401).json({ message: "Customer already exist with same contact" });
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
            res.status(500).json({ message: "Internal server error" })
        }
    }
)

export const getAllCustomers = asyncHandler(
    async (req: ICustomRequest<any>, res: Response) => {
        try {
            const storeId = req.store?._id;
            var tempCustomers: any[] = await Customer.find({ storeId }, { name: 1, contact: 1, _id: 1 });
            let customers: any[] = [];
            for (var customer of tempCustomers) {
                var purchaseHistory = await CustomerBill.aggregate([
                    {
                        $match: {
                            customerId: customer._id,
                        },

                    },
                    {
                        $group: {
                            _id: null,
                            totalAmount: { $sum: "$totalAmount" },
                            lastPurchaseDate: { $max: "$createdAt" }
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

            res.status(200).json(customers);
        } catch (error) {
            console.log("error ", error);
            res.status(500).json({ message: "Internal server error" })
        }
    }
)

export const updateCustomer = asyncHandler(
    async (req: ICustomRequest<any>, res: Response) => {
        try {
            const { id, name, contact } = req.body;
            var customer: any = await Customer.findByIdAndUpdate(id, { name, contact });
            customer.name = name;
            customer.contact = contact;
            res.status(200).json(customer);
        } catch (error) {
            console.log("error ", error);
            res.status(500).json({ message: "Internal server error" })
        }
    }
)

export const deleteCustomer = asyncHandler(
    async (req: ICustomRequest<any>, res: Response) => {
        try {
            const { customerId } = req.query;
            await Customer.findByIdAndDelete(customerId);
            await CustomerBill.deleteMany({ customerId });
            res.status(200).json({ message: "success" });
        } catch (error) {
            console.log("error ", error);
            res.status(500).json({ message: "Internal server error" })
        }
    }
)

export const createBillForCustomer = asyncHandler(
    async (req: ICustomRequest<any>, res: Response) => {
        try {
            const { customerId, items, totalAmount, date } = req.body;
            var new_bill = new CustomerBill({
                customerId,
                items,
                totalAmount,
                date: new Date(date)
            });
            new_bill = await new_bill.save();
            res.status(201).json(new_bill);
        } catch (error) {
            console.log("error ", error);
            res.status(500).json({ message: "Internal server error" })
        }
    }
)

export const markRecievedPayment = asyncHandler(
    async (req: ICustomRequest<any>, res: Response) => {
        try {
            const { customerId, amount, date } = req.body;
            var new_bill = new CustomerBill({
                customerId,
                items: [],
                totalAmount: -amount,
                date: new Date(date)
            });
            new_bill = await new_bill.save();
            res.status(201).json({ message: "Success"});
        } catch (error) {
            console.log("error ", error);
            res.status(500).json({ message: "Internal server error" })
        }
    }
)

export const getCustomerPurchaseHistory = asyncHandler(
    async (req: ICustomRequest<any>, res: Response) => {
        try {
            const { customerId } = req.query;
            const tempBills = await CustomerBill.find({ customerId }, { _id: 1, totalAmount: 1, date: 1 })
            var bills: any[] = [];
            var totalPending = 0;
            for (var bill of tempBills) {
                totalPending += bill.totalAmount;
                bills.push({
                    _id: bill._id,
                    amount: bill.totalAmount,
                    date: bill.date.toDateString()
                });
            }
            res.status(200).json({
                totalPending,
                bills
            });
        } catch (error) {
            console.log("error ", error);
            res.status(500).json({ message: "Internal server error" })
        }
    }
)

export const getSpecificBill = asyncHandler(
    async (req: ICustomRequest<any>, res: Response) => {
        try {
            const { billId } = req.query;
            const bill = await CustomerBill.findById(billId, { _id: true, date: true, items: true, totalAmount: true, customerId: true})
            res.status(200).json(bill);
        } catch (error) {
            console.log("error ", error);
            res.status(500).json({ message: "Internal server error" })
        }
    }
)

export const updateSpecificBill = asyncHandler(
    async (req: ICustomRequest<any>, res: Response) => {
        try {
            const { items, totalAmount, id } = req.body;
            var bill: any = await CustomerBill.findByIdAndUpdate(id, { items, totalAmount });
            bill.items = items;
            bill.totalAmount = totalAmount;
            res.status(200).json(bill);
        } catch (error) {
            console.log("error ", error);
            res.status(500).json({ message: "Internal server error" })
        }
    }
)

export const deleteSpecificBill = asyncHandler(
    async (req: ICustomRequest<any>, res: Response) => {
        try {
            const { billIds } = req.body;
            await CustomerBill.deleteMany({ _id: { $in: billIds }});
            res.status(200).json({ message: "Success" });
        } catch (error) {
            console.log("error ", error);
            res.status(500).json({ message: "Internal server error" })
        }
    }
)