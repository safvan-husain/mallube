import { Schema, model, Document, models } from "mongoose";

export interface IToken extends Document {
  tokenNumber: number;
  storeId:Schema.Types.ObjectId;
  userId:Schema.Types.ObjectId
}

const tokenNumberSchema = new Schema<IToken>({
  tokenNumber: {
    type: Number,
    default: 1,
  },
  storeId:{
    type:Schema.Types.ObjectId,
    required:true
  },
  userId:{
    type:Schema.Types.ObjectId
  }
});

const TokenNumber =  model<IToken>("TokenNumber", tokenNumberSchema);

export default TokenNumber;
