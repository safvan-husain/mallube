import { Document, model, Schema } from "mongoose";
import { Chat } from "./chatsModel";

export interface IMessage extends Document {
    _id: Schema.Types.ObjectId;
    senderId: Schema.Types.ObjectId;
    receiverId: Schema.Types.ObjectId;
    content: string,
    timestamp: Date,
    isRead: boolean;
}

const messageSchema = new Schema<IMessage>(
    {
        senderId: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        receiverId: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        content: {
            type: String,
            required: true,
        },
        timestamp: {
            type: Date,
            required: true,
        },
        isRead: {
            type: Boolean,
            required: true,
        }
    }
)

messageSchema.pre('save', async function(next) {
  const message = this;
  
  // Check if chat exists
  let chat = await Chat.findOne({
    participants: { $all: [message.senderId, message.receiverId] },
  });

  if (!chat) {
    // Create new chat
    const newChat = new Chat({
      participants: [message.senderId, message.receiverId],
      lastMessage: message._id
    });
    await newChat.save();
    chat = newChat;
  } else {
    // Update existing chat
    chat.lastMessage = message._id;
    await chat.save();
  }
  next();
});

export const Message = model<IMessage>('messages', messageSchema)