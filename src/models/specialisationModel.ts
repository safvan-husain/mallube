import mongoose, { Schema, model, Document, models } from "mongoose";

export interface ISpecialisation extends Document {
  name: string;
  storeId:Schema.Types.ObjectId;
}

const specialisationSchem = new Schema<ISpecialisation>({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  storeId:{
    type:Schema.Types.ObjectId,
    required:true

  }
});
const Specialisation = model<ISpecialisation>(
  "Specialisation",
  specialisationSchem
);

export default Specialisation;
