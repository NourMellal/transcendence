import { describe, expect, it } from 'vitest';
import { GameStatus } from '../../src/domain/value-objects';
import { createTestContext } from '../helpers/testContext';

const PLAYER_1 = 'player-1';
const PLAYER_2 = 'player-2';

describe('Full game flow', () => {
    it('runs a full game between two players using in-memory adapters', async () => {
        const context = await createTestContext();
        const { useCases, eventPublisher } = context;

        const createdGame = await useCases.createGame.execute({
            playerId: PLAYER_1,
            opponentId: PLAYER_2,
            mode: 'CLASSIC',
            tournamentId: undefined,
            config: {},
        });

        expect(eventPublisher.created).toContain(createdGame.id);
        expect(createdGame.players).toHaveLength(2);

        await useCases.startGame.execute(createdGame.id);
        const startedGame = await useCases.getGame.execute(createdGame.id);
        expect(eventPublisher.started).toContain(createdGame.id);
        expect(startedGame.status).toBe(GameStatus.IN_PROGRESS);
        expect(startedGame.startedAt).toBeInstanceOf(Date);

        await useCases.handlePaddleMove.execute({
            gameId: createdGame.id,
            playerId: PLAYER_1,
            direction: 'down',
            deltaTime: 0.016,
        });

        await useCases.finishGame.execute({ gameId: createdGame.id, winnerId: PLAYER_1 });
        const finishedGame = await useCases.getGame.execute(createdGame.id);
        expect(eventPublisher.finished).toContain(createdGame.id);
        expect(finishedGame.status).toBe(GameStatus.FINISHED);
        expect(finishedGame.finishedAt).toBeInstanceOf(Date);

        await context.dispose();
    });
});
