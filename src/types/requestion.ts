import { Request } from "express";

export interface ICustomRequest<T> extends Request {
  body: T;
  store?: {
    _id: string
  };
}
