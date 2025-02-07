import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { ICustomRequest } from "../../types/requestion";
import { Customer } from "../../models/customerModel";
import { CustomerBill } from "../../models/customerBillModel";
import { getIST } from "../../utils/ist_time";


export const createCustomer = asyncHandler(
    async (req: ICustomRequest<any> , res: Response) => {
        try {
            const { name, contact } = req.body;
            const storeId = req.store?._id;
            var customer = new Customer(
                {
                    name,
                    contact,
                    storeId
                }
            );
            customer = await customer.save();
            res.status(201).json(customer);
        } catch (error) {
           console.log("error ", error);
           res.status(500).json({ message: "Internal server error"})
        }
    }
)

export const getAllCustomers = asyncHandler(
    async (req: ICustomRequest<any> , res: Response) => {
        try {
            const storeId = req.store?._id;
            const customers = await Customer.find({ storeId }, {name: 1, contact: 1, _id: 1});
            res.status(200).json(customers);
        } catch (error) {
           console.log("error ", error);
           res.status(500).json({ message: "Internal server error"})
        }
    }
)

export const updateCustomer = asyncHandler(
    async (req: ICustomRequest<any> , res: Response) => {
        try {
            const { id, name, contact } = req.body;
            var customer: any = await Customer.findByIdAndUpdate(id,{ name, contact });
            customer.name = name;
            customer.contact = contact;
            res.status(200).json(customer);
        } catch (error) {
           console.log("error ", error);
           res.status(500).json({ message: "Internal server error"})
        }
    }
)

export const deleteCustomer = asyncHandler(
    async (req: ICustomRequest<any> , res: Response) => {
        try {
            const { customerId } = req.query;
            await Customer.findByIdAndDelete(customerId);
            await CustomerBill.deleteMany({ customerId});
            res.status(200).json({ message: "success"});
        } catch (error) {
           console.log("error ", error);
           res.status(500).json({ message: "Internal server error"})
        }
    }
)

export const createBillForCustomer = asyncHandler(
    async (req: ICustomRequest<any> , res: Response) => {
        try {
            const { customerId, items, totalAmount } = req.body;
            var new_bill = new CustomerBill({
                customerId,
                items,
                totalAmount,
                timestamp: getIST()
            });
            new_bill = await new_bill.save();
            res.status(201).json(new_bill);
        } catch (error) {
           console.log("error ", error);
           res.status(500).json({ message: "Internal server error"})
        }
    }
)

export const getCustomerPurchaseHistory = asyncHandler(
    async (req: ICustomRequest<any> , res: Response) => {
        try {
            const { customerId } = req.query;
            const bills = await CustomerBill.find({ customerId }, { _id: 1, totalAmount: 1, timestamp: 1}) 
            res.status(200).json(bills);
        } catch (error) {
           console.log("error ", error);
           res.status(500).json({ message: "Internal server error"})
        }
    }
)

export const getSpecificBill = asyncHandler(
    async (req: ICustomRequest<any> , res: Response) => {
        try {
            const { billId } = req.query;
            const bill = await CustomerBill.findById(billId) 
            res.status(200).json(bill);
        } catch (error) {
           console.log("error ", error);
           res.status(500).json({ message: "Internal server error"})
        }
    }
)

export const updateSpecificBill = asyncHandler(
    async (req: ICustomRequest<any> , res: Response) => {
        try {
             const { items, totalAmount, id } = req.body;
             var bill: any = await CustomerBill.findByIdAndUpdate(id, { items, totalAmount });
             bill.items = items;
             bill.totalAmount = totalAmount;
             res.status(200).json(bill);
        } catch (error) {
           console.log("error ", error);
           res.status(500).json({ message: "Internal server error"})
        }
    }
)

export const deleteSpecificBill = asyncHandler(
    async (req: ICustomRequest<any> , res: Response) => {
        try {
            const { billId } = req.query;
            await CustomerBill.findByIdAndDelete(billId);
            res.status(200).json({ message: "Success"});
        } catch (error) {
           console.log("error ", error);
           res.status(500).json({ message: "Internal server error"})
        }
    }
)