import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { createTestContext } from '../../helpers/testContext';

const PLAYER_1 = 'player-1';
const PLAYER_2 = 'player-2';

describe('HTTP game endpoints', () => {
    let context: Awaited<ReturnType<typeof createTestContext>>;

    beforeEach(async () => {
        context = await createTestContext();
    });

    afterEach(async () => {
        await context.dispose();
    });

    it('creates, lists, fetches, joins, and leaves games with auth headers', async () => {
        const createResponse = await context.httpServer.inject({
            method: 'POST',
            url: '/games',
            headers: {
                'content-type': 'application/json',
                'x-user-id': PLAYER_1,
            },
            payload: { gameMode: 'CLASSIC', isPrivate: false },
        });

        expect(createResponse.statusCode).toBe(201);
        const createdGame = createResponse.json();
        expect(createdGame.player1).toBe(PLAYER_1);
        expect(createdGame.player2).toBeNull();

        const gameId = createdGame.id as string;

        const getResponse = await context.httpServer.inject({
            method: 'GET',
            url: `/games/${gameId}`,
        });
        expect(getResponse.statusCode).toBe(200);
        expect(getResponse.json().id).toBe(gameId);

        const listResponse = await context.httpServer.inject({
            method: 'GET',
            url: '/games',
        });
        expect(listResponse.statusCode).toBe(200);
        const listed = listResponse.json();
        expect(listed.games.length).toBeGreaterThan(0);
        expect(listed.games.some((game: { id: string }) => game.id === gameId)).toBe(true);

        const joinResponse = await context.httpServer.inject({
            method: 'POST',
            url: `/games/${gameId}/join`,
            headers: {
                'x-user-id': PLAYER_2,
            },
        });
        expect(joinResponse.statusCode).toBe(200);
        const joined = joinResponse.json();
        expect(joined.player2).toBe(PLAYER_2);

        const leaveResponse = await context.httpServer.inject({
            method: 'POST',
            url: `/games/${gameId}/leave`,
            headers: {
                'x-user-id': PLAYER_2,
            },
        });
        expect(leaveResponse.statusCode).toBe(204);

        const afterLeaveResponse = await context.httpServer.inject({
            method: 'GET',
            url: `/games/${gameId}`,
        });
        expect(afterLeaveResponse.statusCode).toBe(200);
        expect(afterLeaveResponse.json().player2).toBeNull();
    });
});
