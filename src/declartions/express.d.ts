import { IEmployee} from "../models/managerModel";
import { IPartner} from "../models/Partner";

declare global {
    namespace Express {
        interface Request {
            user?: {
                _id: string;
            };
            employee?: IEmployee;
            partner: IPartner;
            requestedId?: string;
            requesterType?: 'user' | 'business' | 'employee'
        }
    }
}