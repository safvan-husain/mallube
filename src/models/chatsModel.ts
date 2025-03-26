// src/models/chatsModel.ts

import { Document, model, Schema, Types } from "mongoose";
import {Message} from "./messageModel";

export interface IChat extends Document {
  participants: Types.ObjectId[];
  deletedParticipants: Types.ObjectId[];
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
  deletedParticipants: [
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

chatSchema.pre("save", async function (next) {
  if (this.deletedParticipants.length === 2) {
    // Delete all messages related to this chat
    await Message.deleteMany({
      $or: [
        {senderId: this.deletedParticipants[0], receiverId: this.deletedParticipants[1] },
        {senderId: this.deletedParticipants[1], receiverId: this.deletedParticipants[0] },
      ]
    });

    // Delete the chat itself
    await this.deleteOne();
    return; // Stop further processing
  }
  next();
});

export const Chat = model<IChat>("chats", chatSchema);