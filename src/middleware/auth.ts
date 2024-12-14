import jwt, { TokenExpiredError } from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import { NextFunction, Response } from "express";
import {
  RequestWithAdmin,
  RequestWithStaff,
} from "../utils/interfaces/interfaces";
import User from "../models/userModel";
import { config } from "../config/vars";

declare global {
  namespace Express {
    interface Request {
      user?: {
        _id: string;
      };
    }
  }
}

export const admin = asyncHandler(
  async (req: RequestWithAdmin | any, res: Response, next: NextFunction) => {
    let token = req.headers.authorization;
    if (!token) {
      res.status(401);
      throw new Error("Not authorized, no token available");
    }

    try {
      const decoded = jwt.verify(token, "adminSecrete") as {
        _id: string;
      };
      req.user = decoded;
      next();
    } catch (error) {
      if(error instanceof TokenExpiredError){
        res.status(401).json({message:"Token expired, please log in again.",tokenExpired:true})
      }
      res.status(401);
      console.log("Error decoding", error);
      throw new Error("Not authorized as admin, You cant access this resource");
    }
  }
);

export const staff = asyncHandler(
  async (req: RequestWithStaff | any, res: Response, next: NextFunction) => {
    let token = req.headers.authorization;

    if (!token) {
      res.status(401);
      throw new Error("Not authorized, no token available");
    }

    try {
      const decoded = jwt.verify(token, "staffSecrete") as {
        _id: string;
      };
      req.user = decoded;
      next();
    } catch (error) {
      if(error instanceof TokenExpiredError){
        res.status(401).json({message:"Token expired, please log in again.",tokenExpired:true})
      }
      res.status(401);
      console.log("Error decoding", error);
      throw new Error("Not authorized as staff, You cant access this resource");
    }
  }
);

export const store = asyncHandler(
  async (req: any | any, res: Response, next: NextFunction) => {
    let token = req.headers.authorization;

    
    if (!token) {
      res.status(401);
      throw new Error("Not authorized, no token available");
    }

    try {
      const decoded = jwt.verify(token, config.jwtSecret) as {
        _id: string;
      };
      
      req.store = decoded;
      next();
    } catch (error) {
      res.status(401);
      console.log("Error decoding", error);
      throw new Error("Not authorized as staff, You cant access this resource");
    }
  }
);

export const user = asyncHandler(
  async (req: RequestWithStaff | any, res: Response, next: NextFunction) => {
    if (req.headers.authorization?.startsWith("Bearer")) {
      try {
        let token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, config.jwtSecret) as {
          _id: string;
        };

        req.user = await User.findById(decoded._id).select("-password");
        if (!req.user) throw new Error("user is not found");

        next();
      } catch (error) {
        if(error instanceof TokenExpiredError){
          res.status(401).json({message:"Token expired, please log in again.",tokenExpired:true})
        }else{

          res.status(401);
          throw new Error("Not authorized, token verification failed");
        }
      }
    }else{
      res.status(401).json({message:"Not authorized, no token provided."})
    }
  }
);
