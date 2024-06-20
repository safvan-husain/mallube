import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import User from "../../models/userModel";
import bcrypt from "bcryptjs";
import twilio from "twilio";

//twilio configuration
// const accountSid = "AC727f3bdadb360837a5a69a43a2fdd9d0";
// const authToken = "935ce77df01bc438cdda8f66b2b8c9a2";
const accountSid = "ACfe2138bbce21759c477759a9ec72b510";
const authToken = "5b9b15da446ed236a8d8e28bb759a552";
const twilioclient = twilio(accountSid, authToken);

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { fullName, email, password, phone } = req.body;

  const exist = await User.findOne({ email });

  if (exist) {
    res.status(422).json({ message: "email already been used!" });
    return;
  }

  //hash the password
  const hashedPassword = await bcrypt.hash(password, 12);
  console.log("hashedpassword=========> ",hashedPassword)

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

  //save user to database
  await user.save();

  //send otp
  twilioclient.messages
    .create({
      body: `Your OTP is ${otp}`,
      from: "+19894037895", //for testing purpose only, need to change
      to: `+91 97474 03386,
`,
    })
    .then((response) => {
      console.log(response);
      res.status(200).json({ message: "OTP sent successfully" });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ message: "Error sending OTP", error: err });
    });
});

//verify otp
export const verifyOtp = async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  //find user by email
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  //verify otp
  if (user.otp !== otp) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  //mark user as verified
  user.isVerified = true;
  await user.save();

  //generate jwt token
  const token = user.generateAuthToken(user._id);

  res.status(200).json({ message: "OTP verified", token ,statusText:"ok"});
};

export const login = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user: any = await User.findOne({ email });
    if (!user) {
      res.status(404).json({ message: "Please check your email" ,login:false});
    }

    
    //verify password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      res.status(400).json({ message: "Invalid password",login:false });
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
          token: token,
          statusText:"ok"
        });
      } else {
        res.status(500).json({ message: ":email or password wrong!" });
      }
    
  } catch (error) {
    console.log(error);
  }
});
