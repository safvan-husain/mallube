import { Schema, model, Document } from "mongoose";

export interface IProductSearch extends Document {
  productName: string;
  searchCount: number;
}

const productSearchSchema = new Schema<IProductSearch>(
  {
    productName: {
      type: String,
      required: true,
      unique: true,
    },
    searchCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const ProductSearch = model<IProductSearch>("ProductSearch", productSearchSchema);

export default ProductSearch;
