import { Request } from 'express';
import { IAdmin } from '../../models/adminModel';
import { IStaff } from '../../models/staffModel';

export interface RequestWithAdmin extends Request {
  user: IAdmin;
}

export interface DataStoredInToken {
  id: string;
}



export interface RequestWithStaff extends Request {
  user: {
    _id: string; // Assuming _id is the property you want to access in the user object
  };
}
export interface DataStoredInToken {
  id: string;
}
