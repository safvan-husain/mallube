import {Request, Response, Router} from "express";
import asyncHandler from "express-async-handler";
import {z} from "zod";
import {ICustomRequest} from "../../types/requestion";
import {Message} from "../../models/messageModel";
import {Types} from "mongoose";
import * as s from './webSocketController';
import {Chat} from "../../models/chatsModel";
import User from "../../models/userModel";
import {ObjectIdSchema} from "../../types/validation";
import {onCatchError} from "../../error/onCatchError";
import {getChatsRequestSchema, WebSocketMessage} from "./message-validation";
import {errorLogger, logger} from "../../config/logger";
import Store from "../../models/storeModel";

export const getConversation = asyncHandler(
    async (req: Request, res: Response) => {
        const userId = req.requestedId;
        const otherUserId = ObjectIdSchema.parse(req.params.otherUserId);

        try {
            const messages = await Message.find({
                $or: [
                    {senderId: userId, receiverId: otherUserId},
                    {senderId: otherUserId, receiverId: userId}
                ]
            }).sort({createdAt: 1}).lean();
            await Message.updateMany({
                $or: [
                    {senderId: userId, receiverId: otherUserId},
                    {senderId: otherUserId, receiverId: userId}
                ],
                isRead: false
            }, {
                $set: {isRead: true}
            }).lean();
            res.status(200).json(messages.map(e => ({...e, timestamp: e.timestamp.getTime()})));
        } catch (error) {
            onCatchError(error, res);
        }
    }
)

export const getChats = asyncHandler(
    async (req: Request, res: Response) => {
        const requesterId = req.requestedId;
        const data = getChatsRequestSchema.parse(req.query);
        const participantTypes = [];

        if (data.chatSection == 'user') {
            participantTypes.push('user');
        } else {
            participantTypes.push('business');
        }

        try {
            const chats = await Chat.find({participants: {$in: [requesterId]}, participantTypes: { $in: participantTypes}}).populate('lastMessage').lean();
            let result = await Promise.all(
                chats.map(async (e: any) => {
                    let otherUserId: any = e.participants.find((k: any) => k.toString() !== requesterId?.toString());
                    if (!otherUserId) return null; // Handle edge case where no other user is found
                    let otherUserName;
                    switch (data.chatSection) {
                        case 'user':
                            otherUserName = await User.findById(otherUserId, {fullName: true}).lean().then(e => e?.fullName);
                            break;
                        case "freelancer":
                            otherUserName = await Store.findById(otherUserId, { storeOwnerName: true }).lean().then(e => e?.storeOwnerName);
                            break;
                        case "store":
                            otherUserName = await Store.findById(otherUserId, { storeName: true }).lean().then(e => e?.storeName);
                    }
                    if (!otherUserName) return null; // Handle edge case where no other username is found

                    return {
                        _id: otherUserId,
                        name: otherUserName,
                        lastMessage: e.lastMessage.content,
                        timeStamps: e.lastMessage.timestamp.getTime(),
                        isRead: e.lastMessage.isRead
                    };
                })
            );
            res.status(200).json(result.filter(e => e?._id));
        } catch (error) {
            onCatchError(error, res);
        }
    }
)

export const saveMessage = async (message: WebSocketMessage) => {
    try {
        await Message.handleChatCreationOrUpdate({
            senderId: message.senderId,
            receiverId: message.receiverId,
            content: message.content,
            participantTypes: [message.senderCollection, message.receiverCollection]
        });
    } catch (error) {
        errorLogger(error);
    }
}

export const deleteConversation = async (req: Request, res: Response) => {
    try {
        let userId = req.user?._id;
        if (!userId) {
            res.status(400).json({message: "Invalid user id"});
            return;
        }
        let otherUserIds = z.object({
            chatIds: z.array(ObjectIdSchema)
        }).parse(req.body);

        let chats = await Chat.updateMany({
            $and: [
                {participants: {$in: userId}},
                {participants: {$in: otherUserIds}}
            ]
        }, {
            $addToSet: {deletedParticipants: userId}
        })

    } catch (e) {
        onCatchError(e, res);
    }
}