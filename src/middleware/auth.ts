import jwt, { TokenExpiredError } from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import { NextFunction, Response, Request } from "express";
import {
  RequestWithAdmin,
  RequestWithStaff,
} from "../utils/interfaces/interfaces";
import User from "../models/userModel";
import { config } from "../config/vars";
import { Freelancer } from "../models/freelancerModel";
import {Types} from "mongoose";
import Employee, {IEmployee, TEmployeePrivilege} from "../models/managerModel";

declare global {
  namespace Express {
    interface Request {
      user?: {
        _id: string;
      };
      employee?: IEmployee
    }
  }
}

export const admin = asyncHandler(
  async (req: RequestWithAdmin | any, res: Response, next: NextFunction) => {
    let token = req.headers.authorization.split(" ");
    if (token.length > 1) {
      token = token[1];
    } else {
        token = token[0]
    }

      console.log( "token", token, " ",req.headers.authorization)
    console.log(req.originalUrl);

    if (!token) {
      res.status(401).json({ message: "Not authorized" });
      throw new Error("Not authorized, no token available");
    }

    try {
      const decoded = jwt.verify(token, "adminSecrete") as {
        _id: string;
      };
      req.user = decoded;
      next();
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        res.status(401).json({ message: "Token expired, please log in again.", tokenExpired: true })
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

    if (token.startsWith("Bearer")) {
      token = token.split(" ")[1];
    }

    try {
      const decoded = jwt.verify(token, "staffSecrete") as {
        _id: string;
      };
      req.user = decoded;
      next();
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        res.status(401).json({ message: "Token expired, please log in again.", tokenExpired: true })
        return;
      }
      res.status(401).json({ message: "Not authorized as staff, You cant access this resource" });
      console.log("Error decoding", error);
      // throw new Error("Not authorized as staff, You cant access this resource");
    }
  }
);

export const store = asyncHandler(
  async (req: any | any, res: Response, next: NextFunction) => {
    let token = req.headers.authorization;

    if (!token) {
      res.status(401).json({ message: "Not authorized, no token available" });
      return;
    }
    if (token.startsWith("Bearer")) {
      token = token.split(" ")[1];
    }

    try {
      const decoded = jwt.verify(token, config.jwtSecret) as {
        _id: string;
      };

      req.store = decoded;
      next();
    } catch (error) {
      res.status(401).json({ message: "Not authorized as store, You cant access this resource" });
      console.log(`Error decoding for ${req.originalUrl}`, error);
      // throw new Error("Not authorized as staff, You cant access this resource");
    }
  }
);

export const user = asyncHandler(
  async (req: RequestWithStaff | any, res: Response, next: NextFunction) => {
    // req.user = await User.findById("678e2e1f3688427c29eeb9fa").select('-password');
    // next();
    // return;
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
        if (error instanceof TokenExpiredError) {
          res.status(401).json({ message: "Token expired, please log in again.", tokenExpired: true })
        } else {
          // req.user = await User.find({ phone: "9072817417"}).select("-password");
          // if(req.user) {
          //   next();
          //   return;
          // }
          res.status(401).json({ message: "Not authorized, token is not valid.", error })
        }
      }
    } else {
      res.status(401).json({ message: "Not authorized, no token provided." })
    }
  }
);


export const serviceIndivdual = asyncHandler(
  async (req: any, res: Response, next: NextFunction) => {
    try {
      let token = req.headers.authorization.split(" ")[1];
      if (!token) {
        res.status(401).json({ message: "Not authorized, no token available" });
        return;
      }
      const decoded = jwt.verify(token, config.jwtSecret) as {
        _id: string;
      };

      req.requester = await Freelancer.findById(decoded._id).select("-password");
      if (!req.requester) throw new Error("user is not found");
      req.individual = req.requester;

      next();
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        res.status(401).json({ message: "Token expired, please log in again.", tokenExpired: true })
      } else {
        res.status(401).json({ message: "Not authorized, token is not valid.", error })
      }
    }
  }
);

export const employeeProtect = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            let token = req.headers?.authorization?.split(" ").pop();
            if (!token) {
                res.status(401).json({ message: "Not authorized, no token available" });
                return;
            }
            const decoded = jwt.verify(token, 'managerSecret') as {
                _id: string;
                privilege: TEmployeePrivilege;
            };

            let employee = await Employee.findById(decoded._id).select("-password").lean();
            if (!employee) {
                res.status(403).json({ message: "No user found"});
                return;
            }
            if(employee.resignedDate) {
                res.status(403).json({ message: "Not valid since resignation"});
                return;
            }
            req.employee = employee;
            next();
        } catch (error) {
            if (error instanceof TokenExpiredError) {
                res.status(401).json({ message: "Token expired, please log in again.", tokenExpired: true })
            } else {
                res.status(401).json({ message: "Not authorized, token is not valid.", error })
            }
        }
    }
)
