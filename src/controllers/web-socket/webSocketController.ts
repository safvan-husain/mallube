import { Server, Socket } from 'socket.io';
import { createdAtIST, getIST } from '../../utils/ist_time';
import { Types } from 'mongoose';
import { saveMessage } from './messageController';


export const socketHandler = (io: Server) => {
    const userSocketsMap: Map<string, Socket> = new Map();

    io.on('connection', (socket: Socket) => {
        const userId = socket.handshake.query.userId as string;

        if (!Types.ObjectId.isValid(userId)) {
            // If the user exists, reject the connection with an error message
            socket.emit('message', { message:  'not valid ObjectId on userId'});
            socket.disconnect(true);
            return;
        }

        userSocketsMap.set(userId, socket);

        socket.on('message', (data: Message) => {
            data.timestamp = createdAtIST().getTime();
            data.senderId = userId;
            if (!Types.ObjectId.isValid(data.receiverId)) {
                socket.emit('message', { error: 'not valid ObjectId on receiverId' });
                return;
            }
            if (!data.message) {
                socket.emit('message', { error:  'message cannot be empty'});
                return;
            }
            saveMessage(data);
            if (userSocketsMap.has(data.receiverId)) {
                const receiverSocket = userSocketsMap.get(data.receiverId);
                if (receiverSocket) {
                    receiverSocket.emit('message', data);
                }
            } else {
                console.warn(`Receiver not found for message to ${data.receiverId}`);
            }
        });

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${userId}`);
            userSocketsMap.delete(userId);
        });

        socket.on('error', (err) => {
            console.error(`Socket error from ${socket.id}:`, err);
        });
    });
};

export interface Message {
    receiverId: string;
    message: string;
    senderId: string;
    timestamp: number;
}