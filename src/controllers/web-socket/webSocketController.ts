import {DefaultEventsMap, Server, Socket} from 'socket.io';
import { Types } from 'mongoose';
import { saveMessage } from './messageController';
import {errorLogger, logger} from "../../config/logger";
import {WebSocketMessage, webSocketMessageSchema} from "./message-validation";
import {z} from "zod";
import jwt from "jsonwebtoken";
import {config} from "../../config/vars";

interface SocketEvents {
    message: (data: WebSocketMessage) => void;
    error: (data: any) => void;
    appError: (data: { message: string, error?: any}) => void;
}

type AppSocket = Socket<DefaultEventsMap, SocketEvents, DefaultEventsMap, { user: { id: string, type: 'user' | 'business' | 'employee' }}>;

export const socketHandler = (io: Server) => {
    const userSocketsMap: Map<string, AppSocket> = new Map();

    // Add middleware for authentication
    io.use(async (socket: AppSocket, next) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.headers.authorization;

            if (!token) {
                return next(new Error('Authentication token required'));
            }

            const user = authenticateUser(token);

            if (!user) {
                return next(new Error('Invalid authentication token'));
            }
            console.log(user);
            // Add user data to socket for later use
            socket.data.user = {
                id: user._id.toString(),
                type: user.type
            };

            next();
        } catch (error) {
            errorLogger(error);
            next(new Error('Authentication failed'));
        }
    });

    io.on('connection', (socket: AppSocket) => {
        console.log("on connection");
        const userId = socket.data.user.id;
        userSocketsMap.set(userId, socket);

        socket.on('message', async (data: any) => {
            try {
                const messageObject = webSocketMessageSchema.parse(data);
                await saveMessage(messageObject);
                if (userSocketsMap.has(data.receiverId)) {
                    const receiverSocket = userSocketsMap.get(data.receiverId);
                    if (receiverSocket) {
                        receiverSocket.emit('message', messageObject);
                    }
                } else {
                    logger.info(`Receiver not found for message to ${data.receiverId}`);
                }
            } catch (e) {
                if (e instanceof  z.ZodError) {
                    socket.emit('appError', { error: e, message: 'Invalid message format' });
                } else {
                    socket.emit('appError', { error: e, message: 'Unknown Server Error' });
                    errorLogger(e);
                }
            }
        });

        socket.on('disconnect', () => {

            logger.info(`User disconnected: ${userId}`);
            userSocketsMap.delete(userId);
        });

        socket.on('error', (err) => {
            errorLogger(err);
        });
    });
};

const authenticateUser = (token: string) => {
    const decoded = jwt.verify(token, config.jwtSecret) as {
        _id: string;
        type: 'user' | 'business' | 'employee'
    };
    if(!decoded.type) {
        return null;
    }
    return {
        _id: decoded._id,
        type: decoded.type
    }
}