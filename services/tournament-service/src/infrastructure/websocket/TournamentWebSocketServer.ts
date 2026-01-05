import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { TournamentAuthService } from '../auth/TournamentAuthService';

interface LoggerLike {
    info: (message: string, meta?: Record<string, unknown>) => void;
    warn: (message: string, meta?: Record<string, unknown>) => void;
    error: (message: string, meta?: Record<string, unknown>) => void;
}

interface TournamentWebSocketServerDeps {
    readonly authService: TournamentAuthService;
    readonly internalApiKey?: string;
    readonly logger?: LoggerLike;
}

export class TournamentWebSocketServer {
    private readonly io: SocketIOServer;
    private readonly deps: TournamentWebSocketServerDeps;

    constructor(httpServer: HttpServer, deps: TournamentWebSocketServerDeps) {
        this.io = new SocketIOServer(httpServer, {
            cors: { origin: '*' },
            transports: ['websocket'],
            path: '/socket.io'
        });
        this.deps = deps;
        this.configure();
    }

    private configure(): void {
        this.io.use(async (socket: Socket, next: (err?: Error) => void) => {
            try {
                this.ensureInternalKey(socket);
                const token = this.extractToken(socket);
                const authContext = await this.deps.authService.verifyToken(token);
                socket.data.userId = authContext.userId;
                socket.data.claims = authContext.claims;
                next();
            } catch (error) {
                next(error as Error);
            }
        });

        this.io.on('connection', (socket: Socket) => {
            const userId = socket.data.userId as string | undefined;
            if (userId) {
                this.deps.logger?.info('Tournament WS client connected', { userId });
            }
        });
    }

    broadcastTournamentUpdate(payload: unknown): void {
        this.io.emit('tournament:list:updated', { tournament: payload });
    }

    broadcastTournamentList(payload: unknown[]): void {
        this.io.emit('tournament:list:updated', { tournaments: payload });
    }

    broadcastTournamentRemoved(payload: { id: string }): void {
        this.io.emit('tournament:list:removed', payload);
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
