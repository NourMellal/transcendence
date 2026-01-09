import type { FastifyBaseLogger } from 'fastify';
import {
    createDatabaseConnection,
    runMigrations,
    SQLiteTournamentRepository,
    SQLiteTournamentParticipantRepository,
    SQLiteTournamentMatchRepository,
    SQLiteTournamentBracketStateRepository,
    SQLiteUnitOfWork
} from '../infrastructure/database';
import type { TournamentDatabase } from '../infrastructure/database/connection';
import { createMessagingConfig } from '../infrastructure/messaging/config/messaging.config';
import { RabbitMQConnection } from '../infrastructure/messaging/RabbitMQConnection';
import { EventSerializer } from '../infrastructure/messaging/serialization/EventSerializer';
import { RabbitMQTournamentEventPublisher } from '../infrastructure/messaging/RabbitMQPublisher';
import { GameFinishedConsumer } from '../infrastructure/messaging/RabbitMQConsumer';
import { GameServiceClient } from '../infrastructure/external/GameServiceClient';
import {
    CreateTournamentUseCase,
    StartTournamentUseCase,
    CompleteMatchUseCase,
    PlayMatchUseCase,
    LeaveTournamentUseCase
} from '../application/use-cases';
import { JoinTournamentUseCase } from '../application/use-cases/join-tournament.usecase';
import { AutoStartService } from '../application/services';

export interface TournamentServiceConfig {
    PORT: number;
    HOST: string;
    DB_PATH: string;
    GAME_SERVICE_URL: string;
    MAX_PARTICIPANTS: number;
    MIN_PARTICIPANTS: number;
    AUTO_START_TIMEOUT_SECONDS: number;
    vault: unknown;
    internalApiKey?: string;
}

export interface TournamentServiceContainer {
    readonly db: TournamentDatabase;
    readonly repositories: {
        readonly tournamentRepo: SQLiteTournamentRepository;
        readonly participantRepo: SQLiteTournamentParticipantRepository;
        readonly matchRepo: SQLiteTournamentMatchRepository;
        readonly bracketRepo: SQLiteTournamentBracketStateRepository;
    };
    readonly unitOfWork: SQLiteUnitOfWork;
    readonly useCases: {
        readonly createTournament: CreateTournamentUseCase;
        readonly joinTournament: JoinTournamentUseCase;
        readonly leaveTournament: LeaveTournamentUseCase;
        readonly startTournament: StartTournamentUseCase;
        readonly completeMatch: CompleteMatchUseCase;
        readonly playMatch: PlayMatchUseCase;
    };
    readonly services: {
        readonly autoStartService: AutoStartService;
    };
    readonly messaging: {
        readonly connection: RabbitMQConnection;
        readonly publisher: RabbitMQTournamentEventPublisher;
        readonly consumer: GameFinishedConsumer | null;
    };
}

export async function createContainer(
    config: TournamentServiceConfig,
    logger: FastifyBaseLogger
): Promise<TournamentServiceContainer> {
    const messagingConfig = createMessagingConfig();

    const db = await createDatabaseConnection(config.DB_PATH);
    await runMigrations(db);

    const tournamentRepo = new SQLiteTournamentRepository(db);
    const participantRepo = new SQLiteTournamentParticipantRepository(db);
    const matchRepo = new SQLiteTournamentMatchRepository(db);
    const bracketRepo = new SQLiteTournamentBracketStateRepository(db);
    const unitOfWork = new SQLiteUnitOfWork(db);
    const gameServiceClient = new GameServiceClient(config.GAME_SERVICE_URL, config.internalApiKey);

    const serializer = new EventSerializer();
    const messaging = new RabbitMQConnection({
        uri: messagingConfig.uri,
        exchange: messagingConfig.exchange,
        readiness: messagingConfig.readiness,
        logger
    });
    const publisher = new RabbitMQTournamentEventPublisher(messaging, serializer, messagingConfig.exchange);

    const createTournament = new CreateTournamentUseCase(
        tournamentRepo,
        unitOfWork,
        {
            minParticipants: config.MIN_PARTICIPANTS,
            maxParticipants: config.MAX_PARTICIPANTS
        },
        publisher
    );

    const joinTournament = new JoinTournamentUseCase(
        tournamentRepo,
        participantRepo,
        unitOfWork,
        {
            minParticipants: config.MIN_PARTICIPANTS,
            maxParticipants: config.MAX_PARTICIPANTS,
            autoStartTimeoutSeconds: config.AUTO_START_TIMEOUT_SECONDS
        },
        publisher
    );

    const leaveTournament = new LeaveTournamentUseCase(
        tournamentRepo,
        participantRepo,
        matchRepo,
        bracketRepo,
        unitOfWork,
        {
            minParticipants: config.MIN_PARTICIPANTS,
            maxParticipants: config.MAX_PARTICIPANTS,
            autoStartTimeoutSeconds: config.AUTO_START_TIMEOUT_SECONDS
        }
    );

    const startTournament = new StartTournamentUseCase(
        tournamentRepo,
        participantRepo,
        matchRepo,
        bracketRepo,
        unitOfWork,
        {
            minParticipants: config.MIN_PARTICIPANTS,
            maxParticipants: config.MAX_PARTICIPANTS
        },
        publisher
    );

    const completeMatch = new CompleteMatchUseCase(
        tournamentRepo,
        participantRepo,
        matchRepo,
        bracketRepo,
        unitOfWork,
        publisher
    );

    const playMatch = new PlayMatchUseCase(
        tournamentRepo,
        matchRepo,
        unitOfWork,
        gameServiceClient
    );

    const autoStartService = new AutoStartService(
        tournamentRepo,
        participantRepo,
        startTournament,
        {
            minParticipants: config.MIN_PARTICIPANTS,
            maxParticipants: config.MAX_PARTICIPANTS
        },
        logger
    );

    let consumer: GameFinishedConsumer | null = null;
    const queueName = `${messagingConfig.queuePrefix}.game-finished`;

    try {
        await messaging.waitForReadiness();
        const channel = await messaging.getChannel();
        consumer = new GameFinishedConsumer(channel, serializer, completeMatch);
        await consumer.start(queueName);
        logger.info('Tournament service messaging consumer started');
    } catch (error) {
        logger.error(
            { error: error instanceof Error ? error.message : 'unknown' },
            'Failed to initialize RabbitMQ for tournament service'
        );
        await messaging.close();
        throw error;
    }

    return {
        db,
        repositories: {
            tournamentRepo,
            participantRepo,
            matchRepo,
            bracketRepo
        },
        unitOfWork,
        useCases: {
            createTournament,
            joinTournament,
            leaveTournament,
            startTournament,
            completeMatch,
            playMatch
        },
        services: {
            autoStartService
        },
        messaging: {
            connection: messaging,
            publisher,
            consumer
        }
    };
}
