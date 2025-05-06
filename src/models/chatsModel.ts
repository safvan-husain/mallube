// src/models/chatsModel.ts

import { Document, model, Schema, Types } from "mongoose";
import {Message} from "./messageModel";
import {z} from "zod";

export const chatParticipantTypesSchema = z.enum(['user', 'business'])
export type IChatParticipantTypes = z.infer<typeof chatParticipantTypesSchema>;

export interface IChat extends Document {
  participants: Types.ObjectId[];
  deletedParticipants: Types.ObjectId[];
  participantTypes: IChatParticipantTypes[];
  lastMessage: Schema.Types.ObjectId;
}

const chatSchema = new Schema<IChat>({
  participants: [
    {
      type: String,
      required: true,
    },
  ],
  participantTypes: [
    {
      type: String,
      enum: chatParticipantTypesSchema.enum,
      required: true
    }
  ],
  deletedParticipants: [
    {
      type: String,
      required: true,
    },
  ],
  lastMessage: {
    type: Schema.Types.ObjectId,
    ref: "messages",
    required: true,
  },
});

//TODO: llok our delte logic
chatSchema.pre("save", async function (next) {
  if (this.deletedParticipants.length === 0) {
    // Delete all messages related to this chat
    await Message.deleteMany({
      $or: [
        {senderId: this.deletedParticipants[0], receiverId: this.deletedParticipants[1] },
        {senderId: this.deletedParticipants[1], receiverId: this.deletedParticipants[0] },
      ]
    });
  }
  next();
});

export const Chat = model<IChat>("chats", chatSchema);