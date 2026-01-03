import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io'
import { createLogger } from '@transcendence/shared-logging';
import { IEventBus } from '../../domain/events/IeventBus';
import { MessageSentEvent } from '../../domain/events/MessageSentEvent';
import { InviteCreatedEvent } from '../../domain/events/InviteCreatedEvent';
import { InviteAcceptedEvent } from '../../domain/events/InviteAcceptedEvent';
import { InviteDeclinedEvent } from '../../domain/events/inviteDeclinedEvent';

const logger = createLogger('ChatWebSocketServer');

interface ChatWebSocketServerDeps {
    readonly roomManager: any;
    readonly connectionHandler: any;
    readonly sendMessageHandler: any;
    readonly disconnectHandler: any;
    readonly typingHandler: any;
    readonly inviteResponseHandler: any;
    readonly authService: any;
    readonly eventBus: IEventBus;
    readonly internalApiKey?: string;
}

export class ChatWebSocketServer {
    private readonly io: SocketIOServer;
    private readonly deps: ChatWebSocketServerDeps;

    constructor(httpServer: HttpServer, deps: ChatWebSocketServerDeps) {
        this.io = new SocketIOServer(httpServer, {
            cors: { origin: '*' },
            // Gateway proxy strips /api/chat/ws prefix, so we use /socket.io
            path: '/socket.io'
        });
        this.deps = deps;
        this.configure();
        this.subscribeToEvents();
    }

    getSocketServer(): SocketIOServer {
        return this.io;
    }

    private configure(): void {
        this.io.use(async (socket, next) => {
            try {
                this.ensureInternalKey(socket);
                const token = this.extractToken(socket);
                const authContext = await this.deps.authService.verifyToken(token);
                socket.data.userId = authContext.userId;
                socket.data.username = authContext.username;
                next();
            } catch (error) {
                next(error as Error);
            }
        });

        // Only typing handler still needs Socket.IO server reference for broadcasting typing indicators
        if (this.deps.typingHandler.setServer) {
            this.deps.typingHandler.setServer(this.io);
        }

        this.io.on('connection', (socket) => {
            const userId = socket.data.userId;
            const username = socket.data.username;
            
            logger.info(`👤 User connected: ${username} (${userId})`);

            this.deps.connectionHandler.register(socket);
            this.deps.sendMessageHandler.register(socket);
            this.deps.typingHandler.register(socket);
            this.deps.inviteResponseHandler.register(socket);
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

    private ensureInternalKey(socket: Socket): void {
        if (!this.deps.internalApiKey) return;
        const headerKey = socket.handshake.headers['x-internal-api-key'];
        if (headerKey !== this.deps.internalApiKey) {
            throw new Error('Unauthorized');
        }
    }

    private subscribeToEvents(): void {
        // Subscribe to MessageSentEvent
        this.deps.eventBus.subscribe(MessageSentEvent, async (event) => {
            logger.info({ event: event.toJSON() }, 'Broadcasting new_message event');
            
            // Transform event to match frontend ChatMessage interface
            const payload = {
                id: event.messageId,
                conversationId: event.conversationId,
                senderId: event.senderId,
                senderUsername: event.senderUsername,
                content: event.content,
                type: event.messageType,
                recipientId: event.recipientId,
                gameId: event.gameId,
                createdAt: event.occurredAt.toISOString(),
                sentAt: event.occurredAt.toISOString()
            };
            
            // Broadcast to appropriate rooms based on message type
            if (event.messageType === 'GAME' && payload.gameId) {
                // Game messages go to game room
                this.io.to(`game:${payload.gameId}`).emit('new_message', payload);
            } else if (event.recipientId) {
                // Direct messages go to both sender and recipient user rooms
                this.io.to(`user:${event.senderId}`).emit('new_message', payload);
                this.io.to(`user:${event.recipientId}`).emit('new_message', payload);
            }
        });

        // Subscribe to InviteCreatedEvent
        this.deps.eventBus.subscribe(InviteCreatedEvent, async (event) => {
            logger.info({ event: event.toJSON() }, 'Broadcasting invite_created event');
            
            // Send invite notification to recipient
            this.io.to(`user:${event.recipientId}`).emit('invite_received', {
                inviteId: event.inviteId,
                from: event.senderId,
                fromUsername: event.senderUsername,
                conversationId: event.conversationId,
                inviteType: event.inviteType
            });
        });

        // Subscribe to InviteAcceptedEvent
        this.deps.eventBus.subscribe(InviteAcceptedEvent, async (event) => {
            logger.info({ event: event.toJSON() }, 'Broadcasting invite_accepted event');
            
            const payload = {
                inviteId: event.inviteId,
                gameId: event.gameId,
                acceptedBy: event.acceptedBy,
                acceptedByUsername: event.acceptedByUsername,
                conversationId: event.conversationId
            };
            
            // Send to the original inviter (the person who sent the invite)
            this.io.to(`user:${event.inviterId}`).emit('invite_accepted', payload);
        });

        // Subscribe to InviteDeclinedEvent
        this.deps.eventBus.subscribe(InviteDeclinedEvent, async (event) => {
            logger.info({ event: event.toJSON() }, 'Broadcasting invite_declined event');
            
            const payload = {
                inviteId: event.inviteId,
                declinedBy: event.declinedBy,
                declinedByUsername: event.declinedByUsername,
                conversationId: event.conversationId
            };
            
            // Send to the original inviter (the person who sent the invite)
            this.io.to(`user:${event.inviterId}`).emit('invite_declined', payload);
        });
    }
}
