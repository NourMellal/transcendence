import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { IGameStateBroadcaster } from '../../application/ports/broadcasting/IGameStateBroadcaster';
import { GameRoomManager } from './GameRoomManager';
import { ConnectionHandler } from './handlers/ConnectionHandler';
import { PaddleMoveHandler } from './handlers/PaddleMoveHandler';
import { DisconnectHandler } from './handlers/DisconnectHandler';
import { PaddleSetHandler } from './handlers/PaddleSetHandler';
import { GameAuthService } from '../auth';

interface GameWebSocketServerDeps {
    readonly roomManager: GameRoomManager;
    readonly connectionHandler: ConnectionHandler;
    readonly paddleMoveHandler: PaddleMoveHandler;
    readonly disconnectHandler: DisconnectHandler;
    readonly paddleSetHandler: PaddleSetHandler;
    readonly authService: GameAuthService;
}

export class GameWebSocketServer implements IGameStateBroadcaster {
    private readonly io: SocketIOServer;
    private readonly deps: GameWebSocketServerDeps;

    constructor(httpServer: HttpServer, deps: GameWebSocketServerDeps) {
        this.io = new SocketIOServer(httpServer, {
            cors: { origin: '*' },
            transports: ['websocket'], // WebSocket only - no polling fallback
            pingInterval: 10000, // Ping every 10s (default 25s)
            pingTimeout: 5000, // Timeout after 5s (default 20s)
            upgradeTimeout: 5000, // Faster upgrade timeout
            allowEIO3: false, // Disable Engine.IO v3 compatibility
        });
        this.deps = deps;
        deps.roomManager.attachServer(this.io);
        this.configure();
    }

    private configure(): void {
        this.io.use(async (socket, next) => {
            try {
                const token = this.extractToken(socket);
                const authContext = await this.deps.authService.verifyToken(token);
                socket.data.playerId = authContext.playerId;
                socket.data.claims = authContext.claims;
                next();
            } catch (error) {
                next(error as Error);
            }
        });

        this.io.on('connection', (socket) => {
            this.deps.connectionHandler.register(socket);
            this.deps.paddleMoveHandler.register(socket);
            this.deps.paddleSetHandler.register(socket);
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

        throw new Error('Unauthorized: missing token');
    }

    broadcastGameState(gameId: string, payload: unknown): void {
        this.io.to(gameId).emit('game_state', payload);
    }

    broadcastBallState(gameId: string, payload: unknown): void {
        this.io.to(gameId).emit('ball_state', payload);
    }

    broadcastPaddleUpdate(gameId: string, payload: unknown): void {
        this.io.to(gameId).emit('paddle_update', payload);
    }

    broadcastGameFinished(gameId: string, payload: unknown): void {
        this.io.to(gameId).emit('game:finished', payload);
    }
}
