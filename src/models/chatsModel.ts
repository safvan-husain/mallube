// src/models/chatsModel.ts

import { Document, model, Schema, Types } from "mongoose";

export interface IChat extends Document {
  participants: Types.ObjectId[];
  lastMessage: Schema.Types.ObjectId;
}

const chatSchema = new Schema<IChat>({
  participants: [
    {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
  ],
  lastMessage: {
    type: Schema.Types.ObjectId,
    ref: "messages",
    required: true,
  },
});

export const Chat = model<IChat>("chats", chatSchema);