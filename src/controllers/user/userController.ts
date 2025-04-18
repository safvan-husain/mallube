import {Request, Response} from "express";
import asyncHandler from "express-async-handler";
import User from "../../models/userModel";
import bcrypt, {hash} from "bcryptjs";
// import twilio from "twilio";
import Cart from "../../models/cartModel";
import {ICustomRequest, TypedResponse} from "../../types/requestion";
import {IAddCartSchema} from "../../schemas/cart.schema";
import Product from "../../models/productModel";
import jwt, {decode} from "jsonwebtoken";
import TimeSlot, {ITimeSlot} from "../../models/timeSlotModel";
import Booking, {bookingStatusSchema} from "../../models/bookingModel";
import TokenNumber from "../../models/tokenModel";
import Doctor from "../../models/doctorModel";
import Store from "../../models/storeModel";
import mongoose, {Types} from "mongoose";
import Specialisation from "../../models/specialisationModel";
import {calculateDistance} from "../../utils/interfaces/common";
import {ObjectIdSchema} from "../../types/validation";
import {z} from "zod";
import {safeRuntimeValidation, onCatchError} from "../service/serviceContoller";
import {locationQuerySchema} from "../../schemas/localtion-schema";
import {businessAccountTypeSchema} from "../../schemas/store.schema";

const {TWILIO_ACCOUNT_SID, TWILIO_AUTHTOKEN} = process.env;
// const twilioclient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTHTOKEN, {
//   lazyLoading: true,
// });

const twilioServiceId = process.env.TWILIO_SERVICE_ID;

const EXPIRATION_TIME = 5 * 60 * 1000;

export const register = async (req: Request, res: Response) => {
    const {fullName, email, password, phone, fcmToken} = req.body;
    const {v2} = req.query;
    try {
        let exist: any;
        if (email) {
            exist = await User.findOne({
                $or: [{email}, {phone}],
            });
        } else {
            exist = await User.findOne({phone});
        }


        if (exist) {
            const currentTime = new Date().getTime();
            const userCreationTime = new Date(exist.createdAt).getTime();
            //Handling user otp verification in second attempt
            if (
                !exist.isVerified &&
                currentTime - userCreationTime > EXPIRATION_TIME
            ) {
                await User.deleteOne({_id: exist._id});
            } else {
                res.status(422).json({message: "email or phone already been used!"});
                return;
            }
        }
        //hash the password
        const hashedPassword = await bcrypt.hash(password, 12);

        //generate otp
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        //create new user
        var user = new User({
            fullName,
            email,
            password: hashedPassword,
            phone,
            otp,
            isVerified: true,
            fcmToken
        });

        user = await user.save();

        if (v2) {
            res.status(201).json({
                fullName: fullName,
                email: email,
                phone: phone,
                token: user.generateAuthToken()
            });
            return;
        }

        res.status(201).json({
            message: `otp send successfully`,
            otpSend: true,
        });
    } catch (error) {
        res.status(500).json({message: "Internal server error", error});
        console.log(error);
    }
};

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
    try {
        const userId = req.user?._id;
        if (userId === "67c9a1c7a987140c59f6e820") {
            res.status(200).json({message: "Can't delelte this is a testing account"});
            return;
        }
        var deleted = await User.findByIdAndDelete(userId);
        res.status(200).json({message: "User deleted successfully", deleted});
    } catch (error) {
        res.status(500).json({message: "Internal server error", error});
    }
})

//verify otp
export const verifyOtp = async (req: Request, res: Response) => {
    if (!twilioServiceId) {
        return res
            .status(500)
            .json({message: "Twilio service ID is not configured."});
    }
    try {
        const {phone, otp} = req.body;
        //find user by email
        const user = await User.findOne({phone});
        if (!user) {
            return res.status(404).json({message: "User not found"});
        }

        // const verifiedResponse = await twilioclient.verify.v2
        //   .services(twilioServiceId)
        //   .verificationChecks.create({
        //     to: `+91${phone}`,
        //     code: otp,
        //   });

        const verifiedResponse = {status: "approved"};

        //mark user as verified if otp is verified true
        if (verifiedResponse.status === "approved") {
            user.isVerified = true;
            await user.save();
            res.status(200).json({
                message: `OTP verified successfully : ${JSON.stringify(
                    verifiedResponse
                )}`,
                verified: true,
            });
        } else {
            res
                .status(400)
                .json({message: "Wrong OTP , please check again", verified: false});
        }
    } catch (error) {
        console.log(error);
    }
};

export const login = asyncHandler(async (req: Request, res: Response) => {
    try {
        const {username, password, fcmToken} = req.body;
        const user: any = await User.findOne({
            $or: [{email: username}, {phone: username}],
        });
        if (!user) {
            res.status(404).json({message: "Invalid email or phone", login: false});
            return;
        }

        await User.findByIdAndUpdate(user._id, {fcmToken});

        if (user?.isBlocked) {
            res.status(400).json({message: "You are blocked. Contact the owner"});
            return;
        }

        //verify password
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            res.status(400).json({message: "Invalid password", login: false});
            return;
        }

        //check if user is verified
        if (!user.isVerified) {
            res.status(400).json({message: "Please verify your account"});
            return;
        }

        //generate jwt token
        // const token = user.generateAuthToken(user._id);

        // res.status(200).json({ message: "Login successful", token });

        if (match) {
            const token = user.generateAuthToken();
            res.status(200).json({
                _id: user._id,
                name: user.fullName,
                email: user.email,
                phone: user.phone,
                token: token,
                statusText: "ok",
            });
        } else {
            res.status(500).json({message: "email or password wrong!"});
        }
    } catch (error) {
        console.log(error);
        res.status(501).json({message: "Internal server error", error});
    }
});

export const updateUserFcmToken = asyncHandler(
    async (req: ICustomRequest<any>, res: Response) => {
        const userId = req.user?._id;
        try {
            if (userId) {
                await User.findByIdAndUpdate(userId, {fcmToken: req.body.fcmToken});
            }
            res.status(200).json({message: "Token updated successfully"});
        } catch (error) {
            res.status(500).json({message: "Internal server error", error});
        }
    }
)

export const StoreDetailsSchema = z.object({
    type: businessAccountTypeSchema.optional().default('business'),
    location: z.object({
        type: z.string(),
        coordinates: z.tuple([z.number(), z.number()]),
    }),
    _id: z.union([z.string(), z.instanceof(Types.ObjectId)]),
    storeName: z.string(),
    storeOwnerName: z.string().optional().default("Unknown"),
    category: z.string().optional().default(''),
    categories: z.array(z.string()).optional().default([]),
    city: z.string(),
    address: z.string(),
    phone: z.string(),
    whatsapp: z.string(),
    bio: z.string().optional().default(''),
    shopImgUrl: z.string(),
    distance: z.string().optional().default('NA'),
    service: z.boolean().optional().default(false),
    openTime: z.number().optional().default(0),
    closeTime: z.number().optional().default(0),
    isDeliveryAvailable: z.boolean().optional().default(false),
    instagram: z.string().optional().default(''),
    facebook: z.string().optional().default(''),
});

export type StoreDetailsResponse = z.infer<typeof StoreDetailsSchema>;

export const getStoreDetails = asyncHandler(
    async (req: ICustomRequest<undefined>, res: TypedResponse<StoreDetailsResponse>) => {
        try {
            const {storeId, latitude, longitude} = z.object({
                storeId: ObjectIdSchema
            }).merge(locationQuerySchema).parse(req.query);

            let tStore = await Store.findById(storeId, {
                storeName: true, bio: true, address: true, storeOwnerName: true,
                openTime: true, closeTime: true, isDeliveryAvailable: true,
                instagram: true, facebook: true, whatsapp: true,
                phone: true, shopImgUrl: true,
                service: true, location: true, city: true, type: true,
            })
                .populate<{ category: { name: string } }>('category', "name")
                .populate<{ categories: { name: string }[] }>('categories', "name")
                .lean()

            if (!tStore) {
                res.status(401).json({message: "Store not found"});
                return;
            }
            const distance = (calculateDistance(
                latitude,
                longitude,
                tStore.location.coordinates[0],
                tStore.location.coordinates[1]
            )).toFixed(2);
            const data: StoreDetailsResponse =
                {
                    ...tStore,
                    _id: tStore._id.toString(),
                    categories: tStore.categories?.map(e => e.name),
                    category: tStore.category?.name,
                    service: tStore.service ?? false,
                    distance,
                }
            const response = safeRuntimeValidation<StoreDetailsResponse>(StoreDetailsSchema as any, data);
            if (response.error) {
                res.status(500).json(response.error);
                return;
            }
            res.status(200).json(response.data);
        } catch (error) {
            onCatchError(error, res);
        }
    })

//CART
export const addToCart = asyncHandler(
    async (req: ICustomRequest<IAddCartSchema>, res: Response) => {
        const userId = req.user!._id;
        const {productId, quantity} = req.body;

        const productDetails = await Product.findOne({_id: productId}).select({
            store: true,
            individual: true
        });

        if (!productDetails) throw new Error("Product not found");

        const {store: storeId, individual: individualId} = productDetails;

        try {
            // Update existing product or add new product in one query

            const isExists = await Cart.findOne({
                userId,
                $or: [
                    {storeId, individualId}
                ],
                "cartItems.productId": productId,
            });

            if (isExists) {
                var operation = quantity == 1 ? {
                    "$inc": {
                        "cartItems.$.quantity": quantity,
                    }
                } : {
                    "$set": {
                        "cartItems.$.quantity": quantity,
                    }
                };
                await Cart.findOneAndUpdate(
                    {
                        userId,
                        storeId,
                        "cartItems.productId": productId,
                    },
                    operation
                );
            } else {
                await Cart.findOneAndUpdate(
                    {
                        userId,
                        $or: [
                            {storeId, individualId}
                        ],
                        // storeId,
                    },
                    {
                        $push: {
                            cartItems: {
                                productId,
                                quantity,
                            },
                        },
                    },
                    {
                        upsert: true,
                        new: true,
                        rawResult: true,
                    }
                );
            }

            res.status(200).send("ok");
        } catch (error) {
            console.error(error);
            res.status(500).json({message: "Server error"});
        }
    }
);

export const getCart = asyncHandler(
    async (req: ICustomRequest<IAddCartSchema>, res: Response) => {
        const userId = req.user!._id;
        const {storeId: businessId} = req.params;
        const result = await Cart.findOne({
            userId, $or: [
                {storeId: businessId, individualId: businessId}
            ],
        }).populate({
            path: "cartItems.productId",
            model: "products",
        });
        const cartItems = result?.cartItems || [];
        res.status(200).send(cartItems);
    }
);

export const removeCart = asyncHandler(
    async (req: ICustomRequest<IAddCartSchema>, res: Response) => {
        const userId = req.user!._id;
        const {storeId: businessId} = req.params;
        await Cart.deleteOne({
            userId, $or: [
                {storeId: businessId, individualId: businessId}
            ]
        });
        res.status(200).send("ok");
    }
);

export const removeProductFromCart = asyncHandler(
    async (req: ICustomRequest<IAddCartSchema>, res: Response) => {
        const userId = req.user!._id;
        const {storeId: businessId, productId} = req.query;
        try {
            await Cart.updateOne(
                {
                    userId, $or: [
                        {storeId: businessId, individualId: businessId}
                    ]
                },
                {$pull: {cartItems: {productId}}}
            );
            res.status(200).send({message: "removed product"});
        } catch (error) {
            res.status(500).json(error);
        }

    }
);

export const updateProfile = async (req: Request, res: Response) => {
    try {
        const user: any = req.user;

        if (!user || !user._id) {
            return res.status(404).json({message: "User not found"});
        }

        var updatedData: any = {};

        const {fullName, phone, email, password} = req.body;
        if (phone && phone != "" && phone != user.phone) {
            let tUser = await User.findOne({phone});
            if (tUser) {
                res.status(401).json({message: "User already exist with this phone"});
                return;
            }
            updatedData.phone = phone;
        }

        if (email && email != "" && email != user.email) {
            let tUser = await User.findOne({email});
            if (tUser) {
                res.status(401).json({message: "User already exist with this email"});
                return;
            }
            updatedData.email = email;
        }

        if (password && password != "") {
            const hashedPassword = await bcrypt.hash(password, 12);
            updatedData.password = hashedPassword;
        }
        updatedData.fullName = fullName;

        // Perform the update and log the response
        const response = await User.findByIdAndUpdate(
            user._id,
            {$set: updatedData},
            {new: true}
        ).exec(); // Add exec() to return a Promise

        if (!response) {
            return res.status(404).json({message: "User not found after update"});
        }

        res.status(200).json(response);
    } catch (error) {
        res.status(500).json({message: "Internal server error", error});
    }
};

export const updateProfilePassword = async (req: Request, res: Response) => {
    try {
        const {currentPassword, confirmPassword} = req.body;

        const userId = req.user?._id;

        const user: any = await User.findOne({_id: userId});
        if (!user) {
            return res.status(404).json({message: "User not found"});
        }
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({message: "Current password is incorrect"});
        }
        const hashedPassword = await bcrypt.hash(confirmPassword, 10);
        user.password = hashedPassword;
        await user.save();
        res.status(200).json({
            message: "Password updated successfully",
            user,
            passwordUpdated: true,
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({message: "Internal server error"});
    }
};

export const fetchUser = async (req: Request, res: Response) => {
    try {
        const userId = req.user?._id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({message: "User not found"});
        }

        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({message: "Internal server error", error});
    }
};

export const changePushNotificationStatus = async (req: Request, res: Response) => {
    const {status} = req.body;
    try {
        const userId = req.user?._id;
        await User.findByIdAndUpdate(userId, {isPushNotificationEnabled: status})
        res.status(200).json({message: "Success"});
    } catch (error) {
        res.status(500).json({message: "Internal server error", error});
    }
};


export const fetchTimeSlot = async (req: Request, res: Response) => {
    try {
        const {id} = req.params;

        if (!id) return res.status(400).json({message: "Store id is required"});

        const slot: any = await TimeSlot.find({storeId: id}); // here except slots which booking id having the slot id.

        if (!slot || slot.length === 0) {
            return res.status(404).json({message: "No time slot for this store"});
        }

        const availableSlots = slot[0].slots.filter(
            (slot: any) => slot.slotCount > 0
        );
        res.status(200).json(availableSlots);
    } catch (error) {
        console.log("error while fetching slots ", error);
        res.status(500).json({message: "Internal server error", error});
    }
};

//TODO: delete this.
export const slotBooking = async (req: any, res: Response) => {
    try {
        const {slotId, date, startTime, endTime, storeId} = req.body;

        const bookings: any = await Booking.find({storeId: storeId});

        if (bookings.length === 0) {
            await TokenNumber.findOneAndUpdate(
                {storeId: storeId},
                {$set: {tokenNumber: 0}}
            );
        }

        const userId = req.user._id;
        // Validate the slotData and storeId
        if (!slotId || !storeId) {
            return res.status(400).json({message: "Invalid booking data"});
        }
        // check if the slot is available
        const timeslots: any = await TimeSlot.findOneAndUpdate(
            {
                storeId: storeId,
                "slots._id": slotId,
            },
            {
                $inc: {"slots.$.slotCount": -1},
            },
            {new: true}
        );

        const token = await TokenNumber.findOneAndUpdate(
            {storeId},
            {$inc: {tokenNumber: 1}, userId: userId},
            {new: true, upsert: true}
        );

        const newBooking = new Booking({
            timeSlotId: slotId,
            date,
            startTime,
            endTime,
            storeId,
            userId,
            token: token.tokenNumber,
        });

        await newBooking.save();
        await timeslots.save();

        res.status(201).json({
            message: `Booking confirmed.Your token is ${token.tokenNumber}. You will get a call from shop owner.`,
            newBooking,
        });
    } catch (error) {
        console.log("booking error ", error);
        res.status(500).json({message: "Internal server error", error});
    }
};

type TimeSlotResponse = z.infer<typeof timeslotResponseSchema>;

const timeslotResponseSchema = z.object({
    startTime: z.number(),
    endTime: z.number(),
    _id: z.any()
})

export const getAvailableTimeSlotForStoreV2 = asyncHandler(
    async (req: any, res: TypedResponse<TimeSlotResponse[]>) => {
        try {
            const {storeId} = z.object({
                storeId: ObjectIdSchema
            }).parse(req.query);

            console.log("called here w")
            //TODO: remove slots later.
            const tempTimeSlots = await TimeSlot.find({
                storeId,
                numberOfAvailableSeats: {$gt: 0}
            });
            let timeSlots = [];
            for (const slot of tempTimeSlots) {
                try {
                    timeSlots.push(
                        timeslotResponseSchema.parse(
                        {
                            startTime: slot.startTime.getTime(),
                            endTime: slot.endTime.getTime(),
                            numberOfAvailableSeats: slot.numberOfAvailableSeats,
                            _id: slot._id
                        })
                    );
                } catch (error) {
                    console.log("delete old times", error);
                    //TODO:
                }
            }
            res.status(200).json(timeSlots);
        } catch (error) {
            onCatchError(error, res);
        }
    }
)

//
export const slotBookingV2 = async (req: any, res: Response) => {
    try {
        const {slotId} = z.object({
            slotId: ObjectIdSchema
        }).parse(req.body);

        const userId = req.user._id;
        // Validate the slotData and storeId
        if (!slotId) {
            return res.status(400).json({message: "Invalid booking data"});
        }
        // check if the slot is available
        const timeslot: ITimeSlot | null = await TimeSlot.findById(slotId);

        if (!timeslot) {
            return res.status(400).json({message: "Invalid booking data"});
        }

        if (timeslot.numberOfAvailableSeats < 1) {
            return res.status(401).json({message: "No available seats on this specific time"});
        }

        const isExist = await Booking.findOne({timeSlotId: slotId, userId});
        if (isExist) {
            return res.status(401).json({message: "You have already booked this slot"});
        }

        const newBooking = new Booking({
            timeSlotId: slotId,
            storeId: timeslot.storeId,
            startTime: timeslot.startTime,
            endTime: timeslot.endTime,
            userId,
        });

        let booking: any = await newBooking.save();
        booking = booking.toObject();
        booking = {
            ...booking,
            startTime: booking.startTime?.getTime(),
            endTime: booking.endTime?.getTime(),
        }

        res.status(201).json({
            message: `Requested. You will get a call from shop owner.`,
            booking,
        });
    } catch (error) {
        onCatchError(error, res);
    }
};

export const getBookingHistory = async (req: any, res: any) => {
    try {
        let {storeId} = z.object({storeId: ObjectIdSchema}).parse(req.query);
        let bookingHistory: any[] = await Booking.find({storeId, userId: req.user._id}, {
            createdAt: true,
            startTime: true,
            endTime: true,
            isActive: true
        }).lean();
        bookingHistory = bookingHistory.map(e => ({
            ...e,
            startTime: e.startTime?.getTime(),
            endTime: e.endTime?.getTime(),
            createdAt: e.createdAt?.getTime()
        }));
        let responseList = [];
        for (const item of bookingHistory) {
            //TODO: correct these type safety.
            let s = safeRuntimeValidation(userBookingResponse, item as any);
            if (s.error) {
                res.status(500).json(s.error);
                return;
            }
            responseList.push(s.data);
        }
        res.status(200).json(responseList);
    } catch (e) {
        console.log(e);
        onCatchError(e, res);
    }
}

export const deleteBookingHistory = async (req: any, res: any) => {
    try {
        let {storeId} = z.object({storeId: ObjectIdSchema}).parse(req.query);
        let bookingHistory = await Booking.findOneAndDelete({storeId, userId: req.user._id});
        if (bookingHistory) {
            res.status(200).json({message: "Booking deleted successfully"});
            return;
        }
        res.status(404).json({message: "Booking not found"});
    } catch (e) {
        console.log(e);
        onCatchError(e, res);
    }
}

type UserBookingResponse = z.infer<typeof userBookingResponse>;

const userBookingResponse = z.object({
    starTime: z.number(),
    endTime: z.number(),
    _id: z.any(),
    date: z.number(),
    status: bookingStatusSchema.optional().default('pending')
});


export const getBookingsV2 = asyncHandler(
    async (req: any, res: TypedResponse<UserBookingResponse[]>) => {
        try {
            const {storeId} = z.object({
                storeId: ObjectIdSchema
            }).parse(req.query);

            const userId = req.user._id;
            // const bookings = await Booking.find({ userId }, { timeSlotId: true, isActive: true }).populate('timeSlotId');
            const bookings = await Booking.aggregate([
                {
                    $match: {
                        userId: mongoose.Types.ObjectId.createFromHexString(userId),
                        storeId: mongoose.Types.ObjectId.createFromHexString(storeId),
                    },
                },
                {
                    $lookup: {
                        from: "timeslots",
                        localField: "timeSlotId",
                        foreignField: "_id",
                        as: "timeslot",
                    },
                },
                {
                    $unwind: {
                        path: "$timeslot",
                        preserveNullAndEmptyArrays: true
                    },
                },
                {
                    $lookup: {
                        from: "stores",
                        localField: "timeslot.storeId",
                        foreignField: "_id",
                        as: "store"
                    }
                },
                {
                    $unwind: {
                        path: "$store",
                        preserveNullAndEmptyArrays: true
                    },
                },
                {
                    $project: {
                        _id: 1,
                        isActive: 1,
                        "store.storeName": 1,
                        "store.phone": 1,
                        "timeslot.startTime": 1,
                        "timeslot.endTime": 1,
                        createdAt: 1,
                        startTime: 1,
                        endTime: 1,
                        status: 1
                    }
                }
            ]);


            const formattedBookings = bookings.filter((e) => e.timeslot).map((booking: any) => ({
                _id: booking._id,
                isActive: booking.isActive,
                timeslot: booking.timeslot
                    ? {
                        startTime: booking.timeslot.startTime.getTime(),
                        endTime: booking.timeslot.endTime.getTime(),
                        _id: booking.timeslot._id,
                        date: booking.createdAt?.getTime() ?? 0,
                    }
                    : null,
                startTime: booking.startTime,
                endTime: booking.endTime,
                date: booking.createdAt?.getTime() ?? 0,
                status: booking.status,
            }));
            let responseList: UserBookingResponse[] = [];
            for (const item of formattedBookings) {
                //TODO: correct these type safety.
                let s = safeRuntimeValidation(userBookingResponse, item as any);
                if (s.error) {
                    res.status(500).json(s.error);
                    return;
                }
                responseList.push(s.data);
            }

            //TODO: correct type safety here.
            res.status(200).json(responseList);
        } catch (error) {
            onCatchError(error, res);
        }
    }
)

export const cancelBooking = async (req: ICustomRequest<any>, res: TypedResponse<any>) => {
    try {
        const data = z.object({
            bookingId: ObjectIdSchema
        }).parse(req.body);
        const booking = await Booking.findByIdAndUpdate(data.bookingId, {status: bookingStatusSchema.enum.canceled});
        if (!booking) {
            res.status(404).json({message: "Booking not found"});
            return;
        }
        res.status(200).json({message: "Booking cancelled successfully"});
    } catch (e) {
        onCatchError(e, res);
    }
}

export const fetchAllDoctors = async (req: Request, res: Response) => {
    try {
        const {uniqueName} = req.params;
        console.log(uniqueName);

        if (!uniqueName || typeof uniqueName !== "string") {
            return res
                .status(404)
                .json({
                    message: "Store unique name is required and must be a string",
                });
        }

        const store = await Store.findOne({uniqueName: uniqueName});


        if (!store) {
            return res.status(404).json({message: "No store found"});
        }

        const doctors = await Doctor.aggregate([
            {$match: {storeId: new mongoose.Types.ObjectId(store._id)}},
            {
                $lookup: {
                    from: "specialisations",
                    localField: "specialisation",
                    foreignField: "_id",
                    as: "specialisationDetails",
                },
            },
            {$unwind: "$specialisationDetails"},
        ]);

        if (!doctors) {
            return res.status(404).json({message: "No doctors found"});
        }

        res.status(200).json(doctors);
    } catch (error) {
        console.log("error while fetching doctors", error);
        res.status(500).json({message: "Internal server error", error});
    }
};

export const fetchAllSpecialisations = async (req: Request, res: Response) => {
    try {
        const {uniqueName} = req.params;


        if (!uniqueName || typeof uniqueName !== "string") {
            return res
                .status(404)
                .json({
                    message: "Store unique name is required and must be a string",
                });
        }

        const store = await Store.findOne({uniqueName: uniqueName});


        if (!store) {
            return res.status(404).json({message: "No store found"});
        }

        const specialisations = await Specialisation.find({storeId: store?._id})

        if (!specialisations) {
            return res.status(404).json({message: "No specialisations found"});
        }

        res.status(200).json(specialisations)


    } catch (error) {
        console.log("error while fetching specialisation", error);
        res.status(500).json({message: "Internal server error", error});

    }
}