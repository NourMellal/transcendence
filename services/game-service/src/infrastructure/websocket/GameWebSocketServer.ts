import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { GameRoomManager } from './GameRoomManager';
import { ConnectionHandler } from './handlers/ConnectionHandler';
import { PaddleMoveHandler } from './handlers/PaddleMoveHandler';
import { DisconnectHandler } from './handlers/DisconnectHandler';

interface GameWebSocketServerDeps {
    readonly roomManager: GameRoomManager;
    readonly connectionHandler: ConnectionHandler;
    readonly paddleMoveHandler: PaddleMoveHandler;
    readonly disconnectHandler: DisconnectHandler;
}

export class GameWebSocketServer {
    private readonly io: SocketIOServer;
    private readonly deps: GameWebSocketServerDeps;

    constructor(httpServer: HttpServer, deps: GameWebSocketServerDeps) {
        this.io = new SocketIOServer(httpServer, { cors: { origin: '*' } });
        this.deps = deps;
        deps.roomManager.attachServer(this.io);
        this.configure();
    }

    private configure(): void {
        this.io.on('connection', (socket) => {
            this.deps.connectionHandler.register(socket);
            this.deps.paddleMoveHandler.register(socket);
            this.deps.disconnectHandler.register(socket);
        });
    }

    broadcastGameState(gameId: string, payload: unknown): void {
        this.io.to(gameId).emit('game-state', payload);
    }
}
