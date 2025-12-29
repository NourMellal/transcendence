import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import type { FastifyBaseLogger } from 'fastify';
import jwt from 'jsonwebtoken';
import { createUserServiceVault } from '@transcendence/shared-utils';

import { PresenceStatus } from '../../domain/entities/presence.entity';
import type { UserPresenceRepository } from '../../domain/ports';
import type { UserServiceJWTService } from '../services/jwt.service';

interface PresenceWebSocketDependencies {
    presenceRepository: UserPresenceRepository;
    jwtService: UserServiceJWTService;
    logger?: FastifyBaseLogger;
    wsPath?: string;
    internalApiKey?: string | null;
}

interface PresenceTokenPayload {
    userId?: string;
    sub?: string;
    username?: string;
}

export class PresenceWebSocketServer {
    private readonly io: SocketIOServer;
    private readonly presenceRepository: UserPresenceRepository;
    private readonly jwtService: UserServiceJWTService;
    private readonly logger?: FastifyBaseLogger;
    private readonly vaultHelper = createUserServiceVault();
    private vaultInitialized = false;
    private cachedInternalApiKey: string | null;
    private loadingInternalApiKey: Promise<string | null> | null = null;
    private closed = false;
    private readonly connectionCounts = new Map<string, number>();

    constructor(httpServer: HttpServer, deps: PresenceWebSocketDependencies) {
        this.presenceRepository = deps.presenceRepository;
        this.jwtService = deps.jwtService;
        this.logger = deps.logger;
        // Keep WS auth consistent with HTTP middleware: prefer Vault over env fallback.
        this.cachedInternalApiKey = deps.internalApiKey ?? null;

        this.io = new SocketIOServer(httpServer, {
            transports: ['websocket'],
            cors: { origin: '*' },
            path: deps.wsPath ?? '/api/presence/ws/socket.io',
        });

        this.registerMiddlewares();
    }

    async close(): Promise<void> {
        if (this.closed) {
            return;
        }
        await new Promise<void>((resolve) => {
            this.io.close(() => resolve());
        });
        this.closed = true;
    }

    private registerMiddlewares(): void {
        this.io.use(async (socket, next) => {
            try {
                await this.ensureInternalApiKey(socket);
                const token = this.extractToken(socket);
                const payload = await this.verifyToken(token);
                const userId = payload.userId || payload.sub;

                if (!userId) {
                    throw new Error('Unauthorized: missing user id in token');
                }

                socket.data.userId = userId;
                socket.data.username = payload.username;
                next();
            } catch (error) {
                next(error as Error);
            }
        });

        this.io.on('connection', (socket) => {
            const userId = socket.data.userId as string | undefined;
            if (!userId) {
                socket.disconnect(true);
                return;
            }

            this.logger?.info({ userId }, '[PresenceWS] user connected');
            void this.handleConnect(userId);

            socket.on('disconnect', () => {
                this.logger?.info({ userId }, '[PresenceWS] user disconnected');
                void this.handleDisconnect(userId);
            });
        });
    }

    private async handleConnect(userId: string): Promise<void> {
        const current = this.connectionCounts.get(userId) ?? 0;
        this.connectionCounts.set(userId, current + 1);

        if (current > 0) {
            return;
        }

        try {
            await this.presenceRepository.upsert(userId, PresenceStatus.ONLINE, new Date());
            this.io.emit('user_online', { userId });
        } catch (error) {
            this.logger?.error({ err: error, userId }, '[PresenceWS] failed to mark user online');
        }
    }

    private async handleDisconnect(userId: string): Promise<void> {
        const current = this.connectionCounts.get(userId) ?? 0;
        if (current <= 1) {
            this.connectionCounts.delete(userId);
            try {
                await this.presenceRepository.markOffline(userId, new Date());
                this.io.emit('user_offline', { userId });
            } catch (error) {
                this.logger?.error({ err: error, userId }, '[PresenceWS] failed to mark user offline');
            }
            return;
        }

        this.connectionCounts.set(userId, current - 1);
    }

    private async verifyToken(token: string): Promise<PresenceTokenPayload> {
        const config = await this.jwtService.getJWTConfig();
        const payload = jwt.verify(token, config.secretKey, { issuer: config.issuer });

        if (!payload || typeof payload !== 'object') {
            throw new Error('Unauthorized');
        }

        return payload as PresenceTokenPayload;
    }

    private extractToken(socket: Socket): string {
        const tokenQuery = socket.handshake.query?.token;

        if (typeof tokenQuery === 'string' && tokenQuery.trim().length > 0) {
            return tokenQuery;
        }

        if (Array.isArray(tokenQuery) && tokenQuery[0]) {
            return tokenQuery[0];
        }

        const authHeader = socket.handshake.headers['authorization'];
        if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
            return authHeader.slice(7);
        }

        throw new Error('Unauthorized: missing token');
    }

    private async ensureInternalApiKey(socket: Socket): Promise<void> {
        const expected = await this.getInternalApiKey();
        if (!expected) {
            return;
        }

        const providedHeader = socket.handshake.headers['x-internal-api-key'];
        const provided = Array.isArray(providedHeader) ? providedHeader[0] : providedHeader;

        if (provided !== expected) {
            throw new Error('Unauthorized');
        }
    }

    private async getInternalApiKey(): Promise<string | null> {
        if (this.cachedInternalApiKey) {
            return this.cachedInternalApiKey;
        }

        if (this.loadingInternalApiKey) {
            return this.loadingInternalApiKey;
        }

        this.loadingInternalApiKey = (async () => {
            try {
                if (!this.vaultInitialized) {
                    await this.vaultHelper.initialize();
                    this.vaultInitialized = true;
                }

                const key = await this.vaultHelper.getInternalApiKey();
                if (!key) {
                    this.logger?.error('[PresenceWS] INTERNAL_API_KEY not found in Vault');
                    return null;
                }

                this.cachedInternalApiKey = key;
                return key;
            } catch (error) {
                this.logger?.error({ err: error }, '[PresenceWS] failed to load INTERNAL_API_KEY');
                throw error;
            } finally {
                this.loadingInternalApiKey = null;
            }
        })();

        return this.loadingInternalApiKey;
    }
}
