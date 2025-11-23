import { GameController, HealthController } from '../../src/infrastructure/http/controllers';
import { createHttpServer } from '../../src/infrastructure/http/server';
import { createDatabaseConnection, runMigrations, SQLiteGameRepository } from '../../src/infrastructure/database';
import { GamePhysics, CollisionDetector } from '../../src/domain/services';
import {
    CreateGameUseCase,
    FinishGameUseCase,
    GetGameUseCase,
    HandlePaddleMoveUseCase,
    JoinGameUseCase,
    LeaveGameUseCase,
    ListGamesUseCase,
    StartGameUseCase,
    UpdateGameStateUseCase,
    DisconnectPlayerUseCase,
} from '../../src/application/use-cases';
import { IGameEventPublisher } from '../../src/application/ports/messaging/IGameEventPublisher';
import { IUserServiceClient } from '../../src/application/ports/external/IUserServiceClient';
import { IGameStateBroadcaster } from '../../src/application/ports/broadcasting/IGameStateBroadcaster';
import { GameRoomManager } from '../../src/infrastructure/websocket/GameRoomManager';
import { GameLoop } from '../../src/infrastructure/websocket/GameLoop';

export class InMemoryEventPublisher implements IGameEventPublisher {
    readonly created: string[] = [];
    readonly started: string[] = [];
    readonly finished: string[] = [];

    async publishGameCreated(game: { id: string }): Promise<void> {
        this.created.push(game.id);
    }

    async publishGameStarted(game: { id: string }): Promise<void> {
        this.started.push(game.id);
    }

    async publishGameFinished(game: { id: string }): Promise<void> {
        this.finished.push(game.id);
    }
}

export class StubUserServiceClient implements IUserServiceClient {
    constructor(private readonly knownUsers: Set<string> = new Set()) {}

    async getUserSummary(userId: string) {
        return { id: userId, username: userId };
    }

    async ensureUsersExist(userIds: string[]): Promise<void> {
        for (const id of userIds) {
            if (this.knownUsers.size > 0 && !this.knownUsers.has(id)) {
                throw new Error(`Unknown user: ${id}`);
            }
        }
    }
}

export async function createTestContext() {
    const db = await createDatabaseConnection(':memory:');
    await runMigrations(db);

    const repository = new SQLiteGameRepository(db);
    const eventPublisher = new InMemoryEventPublisher();
    const userServiceClient = new StubUserServiceClient();
    const physics = new GamePhysics(new CollisionDetector());

    const createGame = new CreateGameUseCase(repository, eventPublisher, userServiceClient);
    const startGame = new StartGameUseCase(repository, eventPublisher);
    const finishGame = new FinishGameUseCase(repository, eventPublisher);
    const getGame = new GetGameUseCase(repository);
    const listGames = new ListGamesUseCase(repository);
    const joinGame = new JoinGameUseCase(repository);
    const leaveGame = new LeaveGameUseCase(repository);
    const handlePaddleMove = new HandlePaddleMoveUseCase(repository, physics, eventPublisher);
    const updateGameState = new UpdateGameStateUseCase(repository, physics, eventPublisher);
    const disconnectPlayer = new DisconnectPlayerUseCase(repository);

    const gameController = new GameController({
        createGameUseCase: createGame,
        listGamesUseCase: listGames,
        getGameUseCase: getGame,
        joinGameUseCase: joinGame,
        leaveGameUseCase: leaveGame,
    });
    const healthController = new HealthController();

    const httpServer = createHttpServer({
        routes: {
            gameController,
            healthController,
        },
    });

    const gameLoop = new GameLoop(updateGameState, 10);
    const roomManager = new GameRoomManager();

    return {
        db,
        repository,
        eventPublisher,
        userServiceClient,
        physics,
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
        controllers: { gameController, healthController },
        httpServer,
        websocket: { gameLoop, roomManager },
        async dispose() {
            await httpServer.close();
            await db.close();
        },
    };
}

export class InMemoryNamespace implements IGameStateBroadcaster {
    private readonly rooms = new Map<string, Set<InMemorySocket>>();

    addToRoom(roomId: string, socket: InMemorySocket): void {
        const sockets = this.rooms.get(roomId) ?? new Set<InMemorySocket>();
        sockets.add(socket);
        this.rooms.set(roomId, sockets);
    }

    broadcastGameState(gameId: string, payload: unknown): void {
        this.broadcast(gameId, 'game_state', payload);
    }

    broadcast(roomId: string, event: string, payload: unknown): void {
        const sockets = this.rooms.get(roomId);
        if (!sockets) {
            return;
        }

        for (const socket of sockets) {
            socket.emit(event, payload);
        }
    }

    to(roomId: string) {
        return {
            emit: (event: string, payload: unknown) => this.broadcast(roomId, event, payload),
        };
    }
}

export class InMemorySocket {
    private readonly listeners = new Map<string, Array<(payload: any) => any>>();
    readonly id: string;
    readonly rooms = new Set<string>();
    readonly data: Record<string, unknown> = {};

    constructor(private readonly namespace: InMemoryNamespace, id: string) {
        this.id = id;
        this.rooms.add(id);
    }

    get nsp() {
        return this.namespace;
    }

    join(roomId: string): void {
        this.rooms.add(roomId);
        this.namespace.addToRoom(roomId, this);
    }

    on(event: string, handler: (payload: any) => any): this {
        const handlers = this.listeners.get(event) ?? [];
        handlers.push(handler);
        this.listeners.set(event, handlers);
        return this;
    }

    emit(event: string, payload?: unknown): boolean {
        const handlers = this.listeners.get(event) ?? [];
        for (const handler of handlers) {
            handler(payload);
        }
        return handlers.length > 0;
    }

    async dispatch(event: string, payload?: unknown): Promise<void> {
        const handlers = this.listeners.get(event) ?? [];
        for (const handler of handlers) {
            await handler(payload);
        }
    }
}

export class FakeGameLoop {
    readonly started = new Set<string>();
    readonly stopped = new Set<string>();

    constructor(private readonly updater: UpdateGameStateUseCase) {}

    start(gameId: string): void {
        if (this.started.has(gameId)) {
            return;
        }

        this.started.add(gameId);
        void this.updater.execute(gameId, 0.016);
    }

    stop(gameId: string): void {
        this.stopped.add(gameId);
    }
}

export class FakeAuthService {
    async verifyToken(token: string) {
        return { playerId: token, claims: {} } as const;
    }
}

export class RoomBroadcastAdapter {
    constructor(private readonly namespace: InMemoryNamespace) {}

    broadcastGameState(gameId: string, payload: unknown): void {
        this.namespace.broadcast(gameId, 'game_state', payload);
    }
}

export class FakeSocketIOServer {
    constructor(private readonly namespace: InMemoryNamespace) {}

    to(roomId: string) {
        return this.namespace.to(roomId);
    }
}
