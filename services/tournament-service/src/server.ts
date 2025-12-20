import dotenv from 'dotenv';
import { join } from 'path';

// Load only the tournament-service .env (avoid pulling repo-root defaults here)
dotenv.config({ path: join(__dirname, '../.env') });

import fastify from 'fastify';
import { getEnvVarAsNumber, createTournamentServiceVault } from '@transcendence/shared-utils';
import { createLogger } from '@transcendence/shared-logging';
import {
    createDatabaseConnection,
    runMigrations,
    SQLiteTournamentRepository,
    SQLiteTournamentParticipantRepository,
    SQLiteUnitOfWork
} from './infrastructure/database';
import { CreateTournamentUseCase } from './application/use-cases';
import { JoinTournamentUseCase } from './application/use-cases/join-tournament.usecase';
import { Errors, AppError } from './application/errors';
import { Tournament, TournamentMatch, TournamentParticipant } from './domain/entities';

interface TournamentServiceConfig {
    PORT: number;
    HOST: string;
    DB_PATH: string;
    MAX_PARTICIPANTS: number;
    MIN_PARTICIPANTS: number;
    AUTO_START_TIMEOUT_SECONDS: number;
    vault: unknown;
}

// Load configuration with Vault integration
async function loadConfiguration(): Promise<TournamentServiceConfig> {
    const defaults = {
        PORT: getEnvVarAsNumber('TOURNAMENT_SERVICE_PORT', 3004),
        HOST: process.env.TOURNAMENT_SERVICE_HOST || '0.0.0.0',
        DB_PATH: process.env.TOURNAMENT_DB_PATH || './tournament-service.db',
        MAX_PARTICIPANTS: 8,
        MIN_PARTICIPANTS: 4,
        AUTO_START_TIMEOUT_SECONDS: 300
    };

    try {
        const vault = createTournamentServiceVault();
        await vault.initialize();

        const tournamentConfig = await vault.getServiceConfig();
        return {
            ...defaults,
            MAX_PARTICIPANTS: tournamentConfig.maxTournamentSize || defaults.MAX_PARTICIPANTS,
            MIN_PARTICIPANTS: tournamentConfig.minParticipants || defaults.MIN_PARTICIPANTS,
            AUTO_START_TIMEOUT_SECONDS: tournamentConfig.startTimeoutSeconds || defaults.AUTO_START_TIMEOUT_SECONDS,
            vault
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn('Vault not available, using environment variables:', errorMessage);

        return {
            ...defaults,
            vault: null
        };
    }
}

async function createApp() {
    const config = await loadConfiguration();

    const logger = createLogger('tournament-service', {
        pretty: process.env.LOG_PRETTY === 'true'
    });

    const db = await createDatabaseConnection(config.DB_PATH);
    await runMigrations(db);

    const tournamentRepo = new SQLiteTournamentRepository(db);
    const participantRepo = new SQLiteTournamentParticipantRepository(db);
    const unitOfWork = new SQLiteUnitOfWork(db);

    const createTournament = new CreateTournamentUseCase(tournamentRepo, unitOfWork, {
        minParticipants: config.MIN_PARTICIPANTS,
        maxParticipants: config.MAX_PARTICIPANTS
    });

    const joinTournament = new JoinTournamentUseCase(tournamentRepo, participantRepo, unitOfWork, {
        minParticipants: config.MIN_PARTICIPANTS,
        maxParticipants: config.MAX_PARTICIPANTS,
        autoStartTimeoutSeconds: config.AUTO_START_TIMEOUT_SECONDS
    });

    const app = fastify({
        logger
    });

    app.decorate('db', db);
    app.addHook('onClose', async () => {
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
    app.get('/api/tournaments', async (request) => {
        const statusParam = (request.query as any)?.status as string | undefined;
        const status = statusParam && ['recruiting', 'in_progress', 'finished'].includes(statusParam)
            ? (statusParam as any)
            : undefined;

        const tournaments = await tournamentRepo.listByStatus(status);
        return {
            tournaments: tournaments.map((t) => ({
                id: t.id,
                name: t.name,
                creatorId: t.creatorId,
                creatorName: undefined,
                status: t.status,
                currentParticipants: t.currentParticipants,
                maxParticipants: t.maxParticipants,
                minParticipants: t.minParticipants,
                isPublic: t.isPublic,
                accessCode: t.accessCode ?? null,
                requiresPasscode: !t.isPublic,
                readyToStart: t.readyToStart,
                startTimeoutAt: t.startTimeoutAt ? t.startTimeoutAt.toISOString() : null,
                myRole: 'none',
                createdAt: t.createdAt.toISOString(),
                startedAt: t.startedAt ? t.startedAt.toISOString() : null,
                finishedAt: t.finishedAt ? t.finishedAt.toISOString() : null
            }))
        };
    });

    app.get('/api/tournaments/:id', async (request, reply) => {
        try {
            const { id } = request.params as any;
            const tournament = await tournamentRepo.findById(id);
            if (!tournament) {
                throw Errors.notFound('Tournament not found');
            }
            const participants = await participantRepo.listByTournamentId(id);
            // Matches will be added when bracket generation is implemented
            return {
                ...mapTournamentDetail(tournament, participants, []),
            };
        } catch (error) {
            handleError(reply, error);
        }
    });

    app.post('/api/tournaments', async (request, reply) => {
        try {
            const body = request.body as any;
            const creatorId = (request.headers['x-user-id'] as string) || body.creatorId;
            if (!creatorId) {
                throw Errors.unauthorized('Missing user identity');
            }
            const tournament = await createTournament.execute({
                name: body.name,
                bracketType: body.bracketType ?? 'single_elimination',
                isPublic: body.isPublic !== false,
                privatePasscode: body.privatePasscode,
                creatorId
            });

            reply.code(201);
            return mapTournamentDetail(tournament, [], []);
        } catch (error) {
            handleError(reply, error);
        }
    });

    app.post('/api/tournaments/:id/join', async (request, reply) => {
        try {
            const { id } = request.params as any;
            const passcode = (request.query as any)?.passcode as string | undefined;
            const userId = (request.headers['x-user-id'] as string) || (request.body as any)?.userId;
            if (!userId) {
                throw Errors.unauthorized('Missing user identity');
            }

            const result = await joinTournament.execute({
                tournamentId: id,
                userId,
                passcode
            });

            return result;
        } catch (error) {
            handleError(reply, error);
        }
    });

    app.post('/api/tournaments/:id/start', async (_request, reply) => {
        reply.code(501).send({ message: 'Manual start not yet implemented' });
    });

    return { app, config, db };
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

function mapTournamentDetail(
    tournament: Tournament,
    participants: TournamentParticipant[],
    matches: TournamentMatch[]
) {
    return {
        id: tournament.id,
        name: tournament.name,
        creatorId: tournament.creatorId,
        status: tournament.status,
        bracketType: tournament.bracketType,
        currentParticipants: tournament.currentParticipants,
        maxParticipants: tournament.maxParticipants,
        minParticipants: tournament.minParticipants,
        isPublic: tournament.isPublic,
        accessCode: tournament.accessCode ?? null,
        readyToStart: tournament.readyToStart,
        startTimeoutAt: tournament.startTimeoutAt ? tournament.startTimeoutAt.toISOString() : null,
        participants: participants.map((p) => ({
            userId: p.userId,
            username: p.username ?? undefined,
            joinedAt: p.joinedAt.toISOString()
        })),
        matches: matches.map((m) => ({
            id: m.id,
            round: m.round,
            matchPosition: m.matchPosition,
            player1: m.player1Id ? { userId: m.player1Id } : null,
            player2: m.player2Id ? { userId: m.player2Id } : null,
            status: m.status,
            gameId: m.gameId ?? null,
            winnerId: m.winnerId ?? null,
            startedAt: m.startedAt ? m.startedAt.toISOString() : null,
            finishedAt: m.finishedAt ? m.finishedAt.toISOString() : null
        })),
        createdAt: tournament.createdAt.toISOString(),
        startedAt: tournament.startedAt ? tournament.startedAt.toISOString() : null,
        finishedAt: tournament.finishedAt ? tournament.finishedAt.toISOString() : null
    };
}

function handleError(reply: any, error: any) {
    if (error instanceof AppError) {
        reply.code(error.statusCode).send({ message: error.message });
        return;
    }

    reply.code(500).send({ message: 'Internal server error' });
}
