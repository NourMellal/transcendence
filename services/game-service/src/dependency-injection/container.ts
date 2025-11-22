import { GameServiceConfig } from '../infrastructure/config';
import { createDatabaseConnection, runMigrations, SQLiteGameRepository } from '../infrastructure/database';
import { RabbitMQConnection, EventSerializer, RabbitMQGameEventPublisher } from '../infrastructure/messaging';
import { UserServiceClient } from '../infrastructure/external/UserServiceClient';
import {
    CreateGameUseCase,
    FinishGameUseCase,
    GetGameUseCase,
    JoinGameUseCase,
    HandlePaddleMoveUseCase,
    ListGamesUseCase,
    LeaveGameUseCase,
    StartGameUseCase,
    UpdateGameStateUseCase,
    DisconnectPlayerUseCase,
} from '../application/use-cases';
import { GameController, HealthController } from '../infrastructure/http/controllers';
import { GamePhysics, CollisionDetector } from '../domain/services';
import { GameLoop, GameRoomManager, ConnectionHandler, PaddleMoveHandler, DisconnectHandler } from '../infrastructure/websocket';
import { GameAuthService } from '../infrastructure/auth';

export interface GameServiceContainer {
    readonly controllers: {
        readonly gameController: GameController;
        readonly healthController: HealthController;
    };
    readonly websocket: {
        readonly gameLoop: GameLoop;
        readonly roomManager: GameRoomManager;
        readonly connectionHandler: ConnectionHandler;
        readonly paddleMoveHandler: PaddleMoveHandler;
        readonly disconnectHandler: DisconnectHandler;
        readonly authService: GameAuthService;
    };
    readonly useCases: {
        readonly createGame: CreateGameUseCase;
        readonly startGame: StartGameUseCase;
        readonly finishGame: FinishGameUseCase;
        readonly getGame: GetGameUseCase;
        readonly listGames: ListGamesUseCase;
        readonly joinGame: JoinGameUseCase;
        readonly leaveGame: LeaveGameUseCase;
        readonly handlePaddleMove: HandlePaddleMoveUseCase;
        readonly updateGameState: UpdateGameStateUseCase;
        readonly disconnectPlayer: DisconnectPlayerUseCase;
    };
}

export async function createContainer(config: GameServiceConfig): Promise<GameServiceContainer> {
    const db = await createDatabaseConnection(config.databaseFile);
    await runMigrations(db);

    const repository = new SQLiteGameRepository(db);
    const messagingConnection = new RabbitMQConnection({
        uri: config.messaging.uri,
        exchange: config.messaging.exchange,
    });
    const serializer = new EventSerializer();
    const eventPublisher = new RabbitMQGameEventPublisher(messagingConnection, serializer, config.messaging.exchange);
    const userServiceClient = new UserServiceClient(config.userServiceBaseUrl, config.internalApiKey);

    const gamePhysics = new GamePhysics(new CollisionDetector());

    const createGame = new CreateGameUseCase(repository, eventPublisher, userServiceClient);
    const startGame = new StartGameUseCase(repository, eventPublisher);
    const finishGame = new FinishGameUseCase(repository, eventPublisher);
    const getGame = new GetGameUseCase(repository);
    const listGames = new ListGamesUseCase(repository);
    const joinGame = new JoinGameUseCase(repository);
    const leaveGame = new LeaveGameUseCase(repository);
    const handlePaddleMove = new HandlePaddleMoveUseCase(repository, gamePhysics);
    const updateGameState = new UpdateGameStateUseCase(repository, gamePhysics);
    const disconnectPlayer = new DisconnectPlayerUseCase(repository);

    const gameLoop = new GameLoop(updateGameState);
    const roomManager = new GameRoomManager();
    const authService = new GameAuthService();
    const connectionHandler = new ConnectionHandler(roomManager, gameLoop, joinGame, startGame);
    const paddleMoveHandler = new PaddleMoveHandler(handlePaddleMove);
    const disconnectHandler = new DisconnectHandler(disconnectPlayer, roomManager);

    const gameController = new GameController({
        createGameUseCase: createGame,
        listGamesUseCase: listGames,
        getGameUseCase: getGame,
        joinGameUseCase: joinGame,
        leaveGameUseCase: leaveGame,
    });
    const healthController = new HealthController();

    return {
        controllers: {
            gameController,
            healthController,
        },
        websocket: {
            gameLoop,
            roomManager,
            connectionHandler,
            paddleMoveHandler,
            disconnectHandler,
            authService,
        },
        useCases: {
            createGame,
            startGame,
            finishGame,
            getGame,
            listGames,
            joinGame,
            leaveGame,
            handlePaddleMove,
            updateGameState,
            disconnectPlayer,
        },
    };
}
