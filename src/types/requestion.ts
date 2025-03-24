import {Request, Response, Send} from "express";

export interface ICustomRequest<T> extends Request {
  body: T;
  store?: {
    _id: string
  };
  individual?: {
    _id: string
  }
}

export interface ErrorMessage {
  message: string;
}

export interface TypedResponse<T> extends Response {
  json: (json: T | ErrorMessage) => this
}