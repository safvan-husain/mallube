import {Document, Model, model, Schema, Types} from "mongoose";
import {Chat, IChatParticipantTypes} from "./chatsModel";

export interface IMessage extends Document {
    _id: Schema.Types.ObjectId;
    senderId: Schema.Types.ObjectId;
    receiverId: Schema.Types.ObjectId;
    content: string,
    timestamp: Date,
    isRead: boolean;
}

export interface IMessageModel extends Model<IMessage> {
    handleChatCreationOrUpdate: (data: {senderId: Types.ObjectId, receiverId: Types.ObjectId, content: string, participantTypes: IChatParticipantTypes[]}) => Promise<IMessage>;
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
    },
    {
        timestamps: true
    }
)

messageSchema.statics.handleChatCreationOrUpdate =  async function({senderId, receiverId, participantTypes, content}) {
  const message = await Message.create({
      senderId,
      receiverId,
      content,
      timestamp: new Date(),
      isRead: false
  });
  
  // Check if chat [conversation] exists
  let chat = await Chat.findOne({
    participants: { $all: [senderId,receiverId] },
      participantTypes: { $all: participantTypes }
  });

  if (!chat) {
    // Create new chat
      await Chat.create({
      participants: [senderId, receiverId],
        participantTypes,
      lastMessage: message._id
    });
  } else {
    // Update existing chat
    chat.lastMessage = message._id;
    await chat.save();
  }
  return message;
};

export const Message = model<IMessage, IMessageModel>('messages', messageSchema)