import asyncHandler from "express-async-handler";
import {Response} from "express";
import {ICustomRequest, TypedResponse} from "../../types/requestion";
import {Customer} from "../../models/customerModel";
import {CustomerBillModel} from "../../models/customerBillModel";
import {formatLastPurchaseDate} from "../../utils/ist_time";
import {z} from "zod";
import {ObjectIdSchema} from "../../types/validation";
import {Types} from "mongoose";
import {
    createBillRequestSchema, createCustomerRequestSchema, CustomerBillResponse, CustomerBillResponseSchema,
    CustomerResponse,
    CustomerResponseSchema,
    deleteCustomersSchema,
    updateCustomerSchema, updatePattuBookRequestSchema
} from "./validation/pattu-book-validations";
import {onCatchError} from "../../error/onCatchError";
import {runtimeValidation} from "../../error/runtimeValidation";

export const createCustomer = asyncHandler(
    async (req: ICustomRequest<any>, res: Response) => {
        try {
            const {name, contact} = createCustomerRequestSchema.parse(req.body);
            const existingCustomer = await Customer.findOne({contact, customerId: req.store?._id});
            if (existingCustomer) {
                res.status(401).json({message: "Customer already exist with same contact"});
                return;
            }
            const storeId = req.store?._id;
            let customer = new Customer(
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
            const storeId = Types.ObjectId.createFromHexString(req.store!._id.toString());

            // Use a lookup aggregation to join customer and bill data in a single database operation
            const customers = await Customer.aggregate([
                // Match customers for this store
                { $match: { storeId } },

                // Project only the fields we need
                { $project: { name: 1, contact: 1 } },

                // Lookup customer bills
                { $lookup: {
                        from: 'customerbills', // Collection name (adjust if different)
                        localField: '_id',
                        foreignField: 'customerId',
                        as: 'bills'
                    }
                },

                // Calculate purchase statistics
                { $addFields: {
                        balanceAmount: {
                            $cond: {
                                if: { $gt: [{ $size: "$bills" }, 0] },
                                then: { $sum: "$bills.balanceAmount" },
                                else: 0
                            }
                        },
                        lastPurchaseDate: {
                            $cond: {
                                if: { $gt: [{ $size: "$bills" }, 0] },
                                then: { $max: "$bills.createdAt" },
                                else: null
                            }
                        }
                    }
                },

                // Format the response
                { $project: {
                        _id: 1,
                        name: 1,
                        contact: 1,
                        totalAmount: "$balanceAmount",
                        lastPurchase: {
                            $cond: {
                                if: "$lastPurchaseDate",
                                then: { $function: {
                                        body: formatLastPurchaseDate.toString(),
                                        args: ["$lastPurchaseDate"],
                                        lang: "js"
                                    }},
                                else: "not purchased yet"
                            }
                        }
                    }
                }
            ]);

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
            await CustomerBillModel.deleteMany({customerId: {$in: customerIds}});
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

export const createBillForCustomer = asyncHandler(
    async (req: ICustomRequest<any>,
           res: TypedResponse<CustomerBillResponse>) => {
        try {
            const data = createBillRequestSchema.parse(req.body);
            let new_bill = await CustomerBillModel.createDocument({
                ...data,
                date: new Date(data.date)
            });

            new_bill = await new_bill.save();
            res.status(201).json(runtimeValidation(CustomerBillResponseSchema, {
                ...new_bill.toObject(),
                _id: new_bill._id.toString(),
                customerId: new_bill.customerId.toString(),
                date: new_bill.date.getTime()
            }));
        } catch (error) {
            onCatchError(error, res);
        }
    }
)

export const markReceivedPayment = asyncHandler(
    async (req: ICustomRequest<any>, res: Response) => {
        try {
            const {customerId, amount, date} = req.body;
            const new_bill = await CustomerBillModel.createDocument({
                customerId,
                items: [],
                totalAmount: -amount,
                date: new Date(date),
                receivedAmount: amount,
                balanceAmount: 0
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
            const tempBills = await CustomerBillModel.find({customerId}, {
                _id: 1,
                balanceAmount: 1,
                date: 1,
                billPhotoUrl: true
            }).lean<{
                _id: Types.ObjectId,
                balanceAmount: number,
                date: Date,
                billPhotoUrl?: string
            }[]>();
            let bills: any[] = [];
            let totalPending = 0;
            for (const bill of tempBills) {
                totalPending += bill.balanceAmount;
                bills.push({
                    _id: bill._id,
                    amount: bill.balanceAmount,
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
            const bill = await CustomerBillModel.findById(billId).lean()

            if (!bill) {
                res.status(404).json({message: "Bill not found"});
                return;
            }
            res.status(200).json(runtimeValidation(CustomerBillResponseSchema, {
                ...bill,
                _id: bill._id.toString(),
                customerId: bill.customerId.toString(),
                date: bill.date.getTime()
            }));
        } catch (error) {
            onCatchError(error, res);
        }
    }
)

export const updateSpecificBill = asyncHandler(
    async (req: ICustomRequest<any>, res: TypedResponse<CustomerBillResponse>) => {
        try {
            const {id, date, ...rest} = updatePattuBookRequestSchema.parse(req.body);

            const bill = await CustomerBillModel
                .findByIdAndUpdate(id, {...rest , date:date ?  new Date(date) : undefined}, {new: true})
                .lean();

            if(!bill) {
                res.status(404).json({message: "Bill not found"});
                return;
            }
            res.status(200).json(runtimeValidation(CustomerBillResponseSchema, {
                ...bill,
                _id: bill._id.toString(),
                customerId: bill.customerId.toString(),
                date: bill.date.getTime()
            }));
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
            const bills = await CustomerBillModel.deleteMany({_id: {$in: billIds}});
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