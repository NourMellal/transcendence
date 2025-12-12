import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io'
import { logger } from '../config';

interface ChatWebSocketServerDeps {
    readonly roomManager: any;
    readonly connectionHandler: any;
    readonly sendMessageHandler: any;
    readonly disconnectHandler: any;
    readonly typingHandler: any;
    readonly authService: any;
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

        // Set the Socket.IO server on handlers that need broadcasting
        if (this.deps.sendMessageHandler.setServer) {
            this.deps.sendMessageHandler.setServer(this.io);
        }
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
}
