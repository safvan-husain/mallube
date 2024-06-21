import { Schema, model, Document } from "mongoose";

export interface ICart extends Document {
  userId: Schema.Types.ObjectId;
  storeId: Schema.Types.ObjectId;
  cartItems: {
    productId: Schema.Types.ObjectId;
    quantity: Number;
  }[];
}

const cartSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "users",
  },
  storeId: {
    type: Schema.Types.ObjectId,
    ref: "stores",
  },
  cartItems: [
    {
      productId: {
        type: Schema.Types.ObjectId,
        ref: "products",
      },
      quantity: Number,
    },
  ],
});

const Cart = model<ICart>("carts", cartSchema);

export default Cart;
