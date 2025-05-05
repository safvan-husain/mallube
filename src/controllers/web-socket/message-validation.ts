import {z} from 'zod';
import {ObjectIdSchema} from "../../schemas/commom.schema";
import {chatParticipantTypesSchema} from "../../models/chatsModel";

const chatSection = z.enum(['freelancer', 'store', 'user']);

export const getChatsRequestSchema = z.object({
    chatSection: chatSection.default('user')
})

export const webSocketMessageSchema = z.object({
    receiverId: ObjectIdSchema,
    senderId: ObjectIdSchema,
    content: z.string().min(1, {message: "Message cannot be empty"}),
    senderCollection: chatParticipantTypesSchema,
    receiverCollection: chatParticipantTypesSchema,
});

export type WebSocketMessage = z.infer<typeof webSocketMessageSchema>;

//['receiverId', 'content', 'senderId', 'senderCollection', 'receiverCollection']