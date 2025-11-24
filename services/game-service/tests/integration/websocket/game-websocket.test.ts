import { describe, expect, it } from 'vitest';
import { ConnectionHandler } from '../../../src/infrastructure/websocket/handlers/ConnectionHandler';
import { PaddleMoveHandler } from '../../../src/infrastructure/websocket/handlers/PaddleMoveHandler';
import { DisconnectHandler } from '../../../src/infrastructure/websocket/handlers/DisconnectHandler';
import { GameRoomManager } from '../../../src/infrastructure/websocket/GameRoomManager';
import { GameStatus } from '../../../src/domain/value-objects';
import {
    createTestContext,
    FakeGameLoop,
    InMemoryNamespace,
    InMemorySocket,
    RoomBroadcastAdapter,
    FakeSocketIOServer,
} from '../../helpers/testContext';

const PLAYER_1 = 'player-1';
const PLAYER_2 = 'player-2';

describe('Game websocket', () => {
    it('handles join, start, paddle movement, and finish broadcasts', async () => {
        const context = await createTestContext();
        const namespace = new InMemoryNamespace();
        const broadcaster = new RoomBroadcastAdapter(namespace);
        context.useCases.updateGameState.setBroadcaster(broadcaster);

        const gameLoop = new FakeGameLoop(context.useCases.updateGameState);
        const roomManager = new GameRoomManager(new FakeSocketIOServer(namespace) as any);
        const connectionHandler = new ConnectionHandler(
            roomManager,
            gameLoop as any,
            context.useCases.joinGame,
            context.useCases.startGame,
        );
        const paddleMoveHandler = new PaddleMoveHandler(context.useCases.handlePaddleMove);
        const disconnectHandler = new DisconnectHandler(
            context.useCases.disconnectPlayer,
            roomManager,
            gameLoop as any,
        );

        const game = await context.useCases.createGame.execute({
            playerId: PLAYER_1,
            opponentId: undefined,
            mode: 'CLASSIC',
            tournamentId: undefined,
            config: {},
        });

        const socket1 = new InMemorySocket(namespace, PLAYER_1);
        const socket2 = new InMemorySocket(namespace, PLAYER_2);
        socket1.data.playerId = PLAYER_1;
        socket2.data.playerId = PLAYER_2;

        const gameStates: any[] = [];
        const gameStarts: any[] = [];
        const joinedEvents: any[] = [];

        const registerSocket = (socket: InMemorySocket) => {
            connectionHandler.register(socket as any);
            paddleMoveHandler.register(socket as any);
            disconnectHandler.register(socket as any);
            socket.on('game_state', (payload) => gameStates.push(payload));
            socket.on('game_start', (payload) => gameStarts.push(payload));
            socket.on('player_joined', (payload) => joinedEvents.push(payload));
        };

        registerSocket(socket1);
        registerSocket(socket2);

        await socket1.dispatch('join_game', { gameId: game.id });
        await socket2.dispatch('join_game', { gameId: game.id });

        expect(joinedEvents.some((event) => event?.playerId === PLAYER_1)).toBe(true);
        expect(joinedEvents.some((event) => event?.playerId === PLAYER_2)).toBe(true);

        await socket1.dispatch('ready', { gameId: game.id });

        const afterStart = await context.useCases.getGame.execute(game.id);
        expect(afterStart.status).toBe(GameStatus.IN_PROGRESS);
        expect(gameLoop.started.has(game.id)).toBe(true);
        expect(gameStarts.some((payload) => payload?.gameId === game.id)).toBe(true);

        await socket1.dispatch('paddle_move', { gameId: game.id, direction: 'up', deltaTime: 0.02 });

        await context.useCases.finishGame.execute({ gameId: game.id, winnerId: PLAYER_1 });
        await context.useCases.updateGameState.execute(game.id, 0.016);

        const finishedGame = await context.useCases.getGame.execute(game.id);
        expect(finishedGame.status).toBe(GameStatus.FINISHED);
        expect(gameStates.some((state) => state?.status === GameStatus.FINISHED)).toBe(true);

        await context.dispose();
    });
});
