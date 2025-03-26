import {Request, Response, Router} from "express";
import asyncHandler from "express-async-handler";
import {z} from "zod";
import {ICustomRequest} from "../../types/requestion";
import {Message} from "../../models/messageModel";
import {Types} from "mongoose";
import * as s from './webSocketController';
import {onCatchError} from "../service/serviceContoller";
import {Chat} from "../../models/chatsModel";
import User from "../../models/userModel";
import {ObjectIdSchema} from "../../types/validation";

export const getConversation = asyncHandler(
    async (req: ICustomRequest<any>, res: Response) => {
        const userId = req.user?._id;

        const otherUserId = req.params.otherUserId;
        console.log(userId, " - ", otherUserId);
        if (!Types.ObjectId.isValid(otherUserId)) {
            res.status(400).json({message: "Invalid user id"})
        }
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
    async (req: ICustomRequest<any>, res: Response) => {
        const userId = req.user?._id;
        try {
            const chats = await Chat.find({participants: {$in: [userId]}}).populate('lastMessage').lean();
            let result = await Promise.all(
                chats.map(async (e: any) => {
                    let otherUser: any = e.participants.find((k: any) => k.toString() !== userId?.toString());
                    if (!otherUser) return null; // Handle edge case where no other user is found

                    otherUser = await User.findById(otherUser, {fullName: true}).lean();
                    if (!otherUser) return null; // Handle case where user is not found in DB

                    return {
                        _id: otherUser._id,
                        name: otherUser.fullName,
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

export const saveMessage = async (message: s.Message) => {
    try {
        await Message.create({
            senderId: message.senderId,
            receiverId: message.receiverId,
            content: message.content,
            timestamp: message.timestamp,
            isRead: false,
        });
    } catch (error) {
        console.log(error);
    }
}

export const deleteConversation = async (req: ICustomRequest<any>, res: Response) => {
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