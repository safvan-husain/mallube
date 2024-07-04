import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import User from "../../models/userModel";
import bcrypt from "bcryptjs";
import twilio from "twilio";
import Cart from "../../models/cartModel";
import { ICustomRequest } from "../../types/requestion";
import { IAddCartSchema } from "../../schemas/cart.schema";
import Product from "../../models/productModel";

const { TWILIO_ACCOUNT_SID, TWILIO_AUTHTOKEN } = process.env;
const twilioclient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTHTOKEN, {
  lazyLoading: true,
});

const twilioServiceId = process.env.TWILIO_SERVICE_ID;

export const register = async (req: Request, res: Response) => {
  const { fullName, email, password, phone } = req.body;
  try {
    const exist = await User.findOne({ email });

    if (exist) {
      res.status(422).json({ message: "email already been used!" });
    }

    //hash the password
    const hashedPassword = await bcrypt.hash(password, 12);

    //generate otp
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log("otp : ", otp);

    //create new user
    const user = new User({
      fullName,
      email,
      password: hashedPassword,
      phone,
      otp,
      isVerified: false,
    });

    await user.save();

    if (!twilioServiceId) {
      return res
        .status(500)
        .json({ message: "Twilio service ID is not configured." });
    }
    const otpResponse = await twilioclient.verify.v2
      .services(twilioServiceId)
      .verifications.create({
        to: `+91${phone}`,
        channel: "sms",
      });
    res.status(201).json({
      message: `otp send successfully : ${JSON.stringify(otpResponse)}`,
      otpSend: true,
    });
  } catch (error) {
    console.log(error);
  }
};

//verify otp
export const verifyOtp = async (req: Request, res: Response) => {
  if (!twilioServiceId) {
    return res
      .status(500)
      .json({ message: "Twilio service ID is not configured." });
  }
  try {
    const { phone, otp } = req.body;
    //find user by email
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const verifiedResponse = await twilioclient.verify.v2
      .services(twilioServiceId)
      .verificationChecks.create({
        to: `+91${phone}`,
        code: otp,
      });

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
        .json({ message: "Wrong OTP , please check again", verified: false });
    }
  } catch (error) {
    console.log(error);
  }
};

export const login = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user: any = await User.findOne({ email });
    if (!user) {
      res
        .status(404)
        .json({ message: "Please check your email", login: false });
    }

    //verify password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      res.status(400).json({ message: "Invalid password", login: false });
    }

    //check if user is verified
    if (!user.isVerified) {
      res.status(400).json({ message: "Please verify your account" });
    }

    //generate jwt token
    // const token = user.generateAuthToken(user._id);

    // res.status(200).json({ message: "Login successful", token });

    if (match) {
      const token = user.generateAuthToken(user._id);
      res.status(200).json({
        _id: user._id,
        name: user.fullName,
        email: user.email,
        phone: user.phone,
        token: token,
        statusText: "ok",
      });
    } else {
      res.status(500).json({ message: "email or password wrong!" });
    }
  } catch (error) {
    console.log(error);
  }
});

//CART
export const addToCart = asyncHandler(
  async (req: ICustomRequest<IAddCartSchema>, res: Response) => {
    const userId = req.user!._id;
    const { productId, quantity } = req.body;

    const productDetails = await Product.findOne({ _id: productId }).select({
      store: true,
    });

    if (!productDetails) throw new Error("Product not found");

    const { store: storeId } = productDetails;

    try {
      // Update existing product or add new product in one query

      const isExists = await Cart.findOne({
        userId,
        storeId,
        "cartItems.productId": productId,
      });

      if (isExists) {
        await Cart.findOneAndUpdate(
          {
            userId,
            storeId,
            "cartItems.productId": productId,
          },
          {
            $set: {
              "cartItems.$.quantity": quantity,
            },
          }
        );
      } else {
        await Cart.findOneAndUpdate(
          {
            userId,
            storeId,
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
      res.status(500).json({ message: "Server error" });
    }
  }
);

export const getCart = asyncHandler(
  async (req: ICustomRequest<IAddCartSchema>, res: Response) => {
    const userId = req.user!._id;
    const { storeId } = req.params;
    const result = await Cart.findOne({ userId, storeId }).populate({
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
    const { storeId } = req.params;
    await Cart.deleteOne({ userId, storeId });
    res.status(200).send("ok");
  }
);

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user || !user._id) {
      return res.status(404).json({ message: "User not found" });
    }

    const updatingValues = req.body;

    // Perform the update and log the response
    const response = await User.findByIdAndUpdate(
      user._id,
      { $set: updatingValues },
      { new: true }
    ).exec(); // Add exec() to return a Promise

    if (!response) {
      return res.status(404).json({ message: "User not found after update" });
    }

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};
