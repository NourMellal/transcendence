import dotenv from 'dotenv';
import { join } from 'path';

// Load only the tournament-service .env (avoid pulling repo-root defaults here)
dotenv.config({ path: join(__dirname, '../.env') });

import fastify from 'fastify';
import { getEnvVarAsNumber, createTournamentServiceVault } from '@transcendence/shared-utils';
import { createLogger } from '@transcendence/shared-logging';
import { Errors, AppError } from './application/errors';
import { Tournament, TournamentMatch, TournamentParticipant } from './domain/entities';
import { createInternalApiMiddleware } from './infrastructure/http/middlewares/internal-api.middleware';
import { TournamentWebSocketServer } from './infrastructure/websocket';
import { TournamentAuthService } from './infrastructure/auth/TournamentAuthService';
import { createContainer, TournamentServiceConfig } from './dependency-injection/container';

// Load configuration with Vault integration
async function loadConfiguration(): Promise<TournamentServiceConfig> {
    const defaults = {
        PORT: getEnvVarAsNumber('TOURNAMENT_SERVICE_PORT', 3004),
        HOST: process.env.TOURNAMENT_SERVICE_HOST || '0.0.0.0',
        DB_PATH: process.env.TOURNAMENT_DB_PATH || './tournament-service.db',
        GAME_SERVICE_URL: process.env.GAME_SERVICE_URL || 'http://game-service:3002',
        MAX_PARTICIPANTS: 8,
        MIN_PARTICIPANTS: 4,
        AUTO_START_TIMEOUT_SECONDS: 300,
        INTERNAL_API_KEY: process.env.INTERNAL_API_KEY
    };

    try {
        const vault = createTournamentServiceVault();
        await vault.initialize();

        const tournamentConfig = await vault.getServiceConfig();
        const internalApiKey = await vault.getInternalApiKey();
        return {
            ...defaults,
            MAX_PARTICIPANTS: tournamentConfig.maxTournamentSize || defaults.MAX_PARTICIPANTS,
            MIN_PARTICIPANTS: tournamentConfig.minParticipants || defaults.MIN_PARTICIPANTS,
            AUTO_START_TIMEOUT_SECONDS: tournamentConfig.startTimeoutSeconds || defaults.AUTO_START_TIMEOUT_SECONDS,
            vault,
            internalApiKey: internalApiKey ?? defaults.INTERNAL_API_KEY
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn('Vault not available, using environment variables:', errorMessage);

        return {
            ...defaults,
            vault: null,
            internalApiKey: defaults.INTERNAL_API_KEY
        };
    }
}

async function createApp() {
    const config = await loadConfiguration();

    const logger = createLogger('tournament-service', {
        pretty: process.env.LOG_PRETTY === 'true'
    });

    const container = await createContainer(config, logger);
    const { db, messaging } = container;
    const { tournamentRepo, participantRepo, matchRepo } = container.repositories;
    const { createTournament, joinTournament, leaveTournament, startTournament, playMatch } = container.useCases;
    const { autoStartService } = container.services;

    const app = fastify({
        logger
    });

    const tournamentAuthService = new TournamentAuthService();
    const tournamentWebSocket = new TournamentWebSocketServer(app.server, {
        authService: tournamentAuthService,
        internalApiKey: config.internalApiKey,
        logger: app.log
    });

    if (config.internalApiKey) {
        const internalApiMiddleware = createInternalApiMiddleware(config.internalApiKey);
        app.addHook('onRequest', internalApiMiddleware);
    } else {
        app.log.warn('INTERNAL_API_KEY not configured; API Gateway protection is disabled for now');
    }

    const timeoutInterval = setInterval(() => {
        autoStartService.processTimeouts().catch((error) => {
            app.log.error(
                { error: error instanceof Error ? error.message : 'unknown' },
                'Auto-start timeout processing failed'
            );
        });
    }, 30_000);

    app.addHook('onClose', async () => {
        clearInterval(timeoutInterval);
        await messaging.connection.close().catch(() => undefined);
        await db.close();
    });

    // Log configuration status
    if (config.vault) {
        app.log.info('Tournament service initialized with Vault integration');
        app.log.info('Using tournament configuration from Vault');
    } else {
        app.log.warn('Tournament service using environment variables (Vault unavailable)');
    }

    // Health check
    app.get('/health', async () => {
        return {
            status: 'ok',
            service: 'tournament-service',
            timestamp: new Date().toISOString()
        };
    });

    // Placeholder routes
    app.get('/tournaments', async (request) => {
        const status = validateStatusFilter((request.query as any)?.status);
        let tournaments = await tournamentRepo.listByStatus(status);
        const search = validateSearchQuery((request.query as any)?.search);
        if (search) {
            const needle = search.toLowerCase();
            tournaments = tournaments.filter((t) => {
                const nameMatch = t.name.toLowerCase().includes(needle);
                const codeMatch = t.isPublic && t.accessCode
                    ? t.accessCode.toLowerCase().includes(needle)
                    : false;
                return nameMatch || codeMatch;
            });
        }
        return {
            tournaments: tournaments.map(mapTournamentSummary)
        };
    });

    app.get('/tournaments/my-tournaments', async (request, reply) => {
        try {
            const userId = getUserIdFromHeaders(request.headers as Record<string, unknown>);
            const status = validateStatusFilter((request.query as any)?.status);

            const tournaments = await tournamentRepo.listByUser(userId, status);
            return {
                tournaments: tournaments.map(mapTournamentSummary)
            };
        } catch (error) {
            handleError(reply, error);
        }
    });

    app.get('/tournaments/:id', async (request, reply) => {
        try {
            const { id } = validateIdParams(request.params as any);
            const tournament = await tournamentRepo.findById(id);
            if (!tournament) {
                throw Errors.notFound('Tournament not found');
            }
            const participants = await participantRepo.listByTournamentId(id);
            const matches = await matchRepo.listByTournamentId(id);
            return {
                ...mapTournamentDetail(tournament, participants, matches),
            };
        } catch (error) {
            handleError(reply, error);
        }
    });

    app.post('/tournaments', async (request, reply) => {
        try {
            const body = validateCreateTournamentBody(request.body as any);
            const creatorId = getUserIdFromHeaders(request.headers as Record<string, unknown>);
            const tournament = await createTournament.execute({
                name: body.name,
                bracketType: body.bracketType ?? 'single_elimination',
                isPublic: body.isPublic !== false,
                privatePasscode: body.privatePasscode,
                creatorId
            });

            tournamentWebSocket.broadcastTournamentUpdate(mapTournamentSummary(tournament));

            reply.code(201);
            return mapTournamentDetail(tournament, [], []);
        } catch (error) {
            handleError(reply, error);
        }
    });

    app.post('/tournaments/:id/join', async (request, reply) => {
        try {
            const { id } = validateIdParams(request.params as any);
            const passcode = validatePasscodeQuery(request.query as any);
            const userId = getUserIdFromHeaders(request.headers as Record<string, unknown>);

            const result = await joinTournament.execute({
                tournamentId: id,
                userId,
                passcode
            });

            if (result.autoStart) {
                const started = await startTournament.execute({
                    tournamentId: id,
                    reason: 'auto_full'
                });

                tournamentWebSocket.broadcastTournamentUpdate(mapTournamentSummary(started.tournament));

                return {
                    ...result,
                    status: started.tournament.status,
                    tournament: mapTournamentDetail(started.tournament, started.participants, started.matches)
                };
            }

            const updated = await tournamentRepo.findById(id);
            if (updated) {
                tournamentWebSocket.broadcastTournamentUpdate(mapTournamentSummary(updated));
            }

            return result;
        } catch (error) {
            handleError(reply, error);
        }
    });

    app.post('/tournaments/:id/leave', async (request, reply) => {
        try {
            const { id } = validateIdParams(request.params as any);
            const userId = getUserIdFromHeaders(request.headers as Record<string, unknown>);

            const result = await leaveTournament.execute({
                tournamentId: id,
                userId
            });

            if (result.tournamentDeleted) {
                tournamentWebSocket.broadcastTournamentRemoved({ id });
                return reply.code(204).send();
            }

            const updated = await tournamentRepo.findById(id);
            if (updated) {
                tournamentWebSocket.broadcastTournamentUpdate(mapTournamentSummary(updated));
            } else {
                tournamentWebSocket.broadcastTournamentRemoved({ id });
            }

            return reply.code(204).send();
        } catch (error) {
            handleError(reply, error);
        }
    });

    app.post('/tournaments/:id/start', async (request, reply) => {
        try {
            const { id } = validateIdParams(request.params as any);
            const userId = getUserIdFromHeaders(request.headers as Record<string, unknown>);

            const started = await startTournament.execute({
                tournamentId: id,
                requestedBy: userId,
                reason: 'manual'
            });

            tournamentWebSocket.broadcastTournamentUpdate(mapTournamentSummary(started.tournament));

            return mapTournamentDetail(started.tournament, started.participants, started.matches);
        } catch (error) {
            handleError(reply, error);
        }
    });

    app.get('/tournaments/:id/bracket', async (request, reply) => {
        try {
            const { id } = validateIdParams(request.params as any);
            const tournament = await tournamentRepo.findById(id);
            if (!tournament) {
                throw Errors.notFound('Tournament not found');
            }

            const matches = await matchRepo.listByTournamentId(id);
            return {
                matches: matches.map(mapTournamentMatch)
            };
        } catch (error) {
            handleError(reply, error);
        }
    });

    app.post('/tournaments/:id/matches/:matchId/play', async (request, reply) => {
        try {
            const { id, matchId } = validateMatchParams(request.params as any);
            const userId = getUserIdFromHeaders(request.headers as Record<string, unknown>);

            const result = await playMatch.execute({
                tournamentId: id,
                matchId,
                userId
            });

            return result;
        } catch (error) {
            handleError(reply, error);
        }
    });

    return { app, config };
}

async function start() {
    if (process.env.TOURNAMENT_SERVICE_DISABLED === 'true') {
        console.log('Tournament Service disabled via TOURNAMENT_SERVICE_DISABLED=true (skip listen)');
        return;
    }

    try {
        const { app, config } = await createApp();
        await app.listen({ port: config.PORT, host: config.HOST });
        console.log(`Tournament Service running on port ${config.PORT}`);
    } catch (error) {
        const err = error as NodeJS.ErrnoException;
        if (err?.code === 'EACCES' || err?.code === 'EPERM') {
            console.warn(
                'Tournament Service could not bind to the requested port/host (permission denied). ' +
                'If you are in a restricted environment, set TOURNAMENT_SERVICE_DISABLED=true to skip starting it, ' +
                'or run the stack via Docker where the service can bind normally.'
            );
            return;
        }
        console.error('Failed to start Tournament Service:', error);
        process.exit(1);
    }
}

start();

function mapTournamentSummary(tournament: Tournament) {
    return {
        id: tournament.id,
        name: tournament.name,
        creatorId: tournament.creatorId,
        creatorName: undefined,
        status: tournament.status,
        currentParticipants: tournament.currentParticipants,
        maxParticipants: tournament.maxParticipants,
        minParticipants: tournament.minParticipants,
        isPublic: tournament.isPublic,
        accessCode: tournament.accessCode ?? null,
        requiresPasscode: !tournament.isPublic,
        readyToStart: tournament.readyToStart,
        startTimeoutAt: tournament.startTimeoutAt ? tournament.startTimeoutAt.toISOString() : null,
        myRole: 'none',
        createdAt: tournament.createdAt.toISOString(),
        startedAt: tournament.startedAt ? tournament.startedAt.toISOString() : null,
        finishedAt: tournament.finishedAt ? tournament.finishedAt.toISOString() : null
    };
}

function mapTournamentMatch(match: TournamentMatch) {
    return {
        id: match.id,
        tournamentId: match.tournamentId,
        round: match.round,
        matchPosition: match.matchPosition,
        player1: match.player1Id ? { userId: match.player1Id } : null,
        player2: match.player2Id ? { userId: match.player2Id } : null,
        status: match.status,
        gameId: match.gameId ?? null,
        winnerId: match.winnerId ?? null,
        startedAt: match.startedAt ? match.startedAt.toISOString() : null,
        finishedAt: match.finishedAt ? match.finishedAt.toISOString() : null
    };
}

function mapTournamentDetail(
    tournament: Tournament,
    participants: TournamentParticipant[],
    matches: TournamentMatch[]
) {
    return {
        ...mapTournamentSummary(tournament),
        bracketType: tournament.bracketType,
        participants: participants.map((p) => ({
            userId: p.userId,
            username: p.username ?? undefined,
            joinedAt: p.joinedAt.toISOString()
        })),
        matches: matches.map(mapTournamentMatch)
    };
}

function handleError(reply: any, error: any) {
    if (error instanceof AppError) {
        reply.code(error.statusCode).send({ message: error.message });
        return;
    }

    reply.code(500).send({ message: 'Internal server error' });
}

type TournamentStatus = 'recruiting' | 'in_progress' | 'finished';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function ensureUuid(value: unknown, fieldName: string): string {
    if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
        throw Errors.badRequest(`Invalid ${fieldName}`);
    }
    return value;
}

function getUserIdFromHeaders(headers: Record<string, unknown>): string {
    const raw = headers['x-user-id'];
    if (typeof raw !== 'string' || raw.trim() === '') {
        throw Errors.unauthorized('Missing user identity');
    }
    return raw;
}

function validateStatusFilter(value: unknown): TournamentStatus | undefined {
    if (value === undefined || value === null || value === '') {
        return undefined;
    }
    if (typeof value !== 'string') {
        throw Errors.badRequest('Invalid status filter');
    }
    const allowed: TournamentStatus[] = ['recruiting', 'in_progress', 'finished'];
    if (!allowed.includes(value as TournamentStatus)) {
        throw Errors.badRequest('Invalid status filter');
    }
    return value as TournamentStatus;
}

function validateSearchQuery(value: unknown): string {
    if (value === undefined || value === null) {
        return '';
    }
    if (typeof value !== 'string') {
        throw Errors.badRequest('Invalid search query');
    }
    return value.trim();
}

function validateIdParams(params: any): { id: string } {
    return { id: ensureUuid(params?.id, 'id') };
}

function validatePasscodeQuery(query: any): string | undefined {
    if (!query?.passcode) return undefined;
    if (typeof query.passcode !== 'string' || query.passcode.trim().length === 0) {
        throw Errors.badRequest('Invalid passcode');
    }
    return query.passcode;
}

function validateMatchParams(params: any): { id: string; matchId: string } {
    return {
        id: ensureUuid(params?.id, 'id'),
        matchId: ensureUuid(params?.matchId, 'match id')
    };
}

function validateCreateTournamentBody(body: any) {
    if (!body || typeof body !== 'object') {
        throw Errors.badRequest('Invalid request body');
    }

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (name.length < 3) {
        throw Errors.badRequest('Tournament name must be at least 3 characters');
    }

    if (body.bracketType !== undefined && body.bracketType !== 'single_elimination') {
        throw Errors.badRequest('Only single_elimination bracket type is supported');
    }

    if (body.isPublic !== undefined && typeof body.isPublic !== 'boolean') {
        throw Errors.badRequest('Invalid isPublic flag');
    }

    if (body.isPublic === false && (!body.privatePasscode || typeof body.privatePasscode !== 'string')) {
        throw Errors.badRequest('Private tournaments require a passcode');
    }

    if (body.privatePasscode !== undefined && body.isPublic !== false) {
        throw Errors.badRequest('privatePasscode is only allowed for private tournaments');
    }

    return {
        name,
        bracketType: body.bracketType,
        isPublic: body.isPublic,
        privatePasscode: body.privatePasscode
    };
}
