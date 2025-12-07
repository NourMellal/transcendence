import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { Message } from '../../domain/entities/message.entity';
import { logger } from '../config';

interface ChatWebSocketServerDeps {
    readonly roomManager: any;
    readonly connectionHandler: any;
    readonly sendMessageHandler: any;
    readonly disconnectHandler: any;
    readonly authService: any;
}

export class ChatWebSocketServer {
    private readonly io: SocketIOServer;
    private readonly deps: ChatWebSocketServerDeps;

    constructor(httpServer: HttpServer, deps: ChatWebSocketServerDeps) {
        this.io = new SocketIOServer(httpServer, {
            cors: { origin: '*' },
            path: '/chat'
        });
        this.deps = deps;
        this.configure();
    }

    private configure(): void {
        this.io.use(async (socket, next) => {
            try {
                const token = this.extractToken(socket);
                const authContext = await this.deps.authService.verifyToken(token);
                socket.data.userId = authContext.userId;
                socket.data.username = authContext.username;
                next();
            } catch (error) {
                next(error as Error);
            }
        });

        this.io.on('connection', (socket) => {
            const userId = socket.data.userId;
            const username = socket.data.username;
            
            logger.info(`👤 User connected: ${username} (${userId})`);

            this.deps.connectionHandler.register(socket);
            this.deps.sendMessageHandler.register(socket);
            this.deps.disconnectHandler.register(socket);
        });
    }

    private extractToken(socket: Socket): string {
        const tokenQuery = socket.handshake.query?.token;

        if (typeof tokenQuery === 'string' && tokenQuery.trim().length > 0) {
            return tokenQuery;
        }

        if (Array.isArray(tokenQuery) && tokenQuery[0]?.trim()) {
            return tokenQuery[0];
        }

        const authHeader = socket.handshake.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }

        throw new Error('Unauthorized: missing token');
    }

    broadcastGlobalMessage(message: Message): void {
        this.io.to('global').emit('new_message', {
            id: message.id.toString(),
            senderId: message.senderId,
            senderUsername: message.senderUsername,
            content: message.content.getValue(),
            type: message.type,
            createdAt: message.createdAt.toISOString()
        });
    }

    broadcastPrivateMessage(message: Message): void {
        if (message.recipientId) {
            this.io.to(`user:${message.senderId}`).emit('new_message', {
                id: message.id.toString(),
                senderId: message.senderId,
                senderUsername: message.senderUsername,
                content: message.content.getValue(),
                type: message.type,
                recipientId: message.recipientId,
                createdAt: message.createdAt.toISOString()
            });

            this.io.to(`user:${message.recipientId}`).emit('new_message', {
                id: message.id.toString(),
                senderId: message.senderId,
                senderUsername: message.senderUsername,
                content: message.content.getValue(),
                type: message.type,
                recipientId: message.recipientId,
                createdAt: message.createdAt.toISOString()
            });
        }
    }

    broadcastGameMessage(message: Message): void {
        if (message.gameId) {
            this.io.to(`game:${message.gameId}`).emit('new_message', {
                id: message.id.toString(),
                senderId: message.senderId,
                senderUsername: message.senderUsername,
                content: message.content.getValue(),
                type: message.type,
                gameId: message.gameId,
                createdAt: message.createdAt.toISOString()
            });
        }
    }
}
