import { describe, it, expect } from 'vitest';
import { Game } from '../../../../src/domain/entities/Game';
import { GameStatus } from '../../../../src/domain/value-objects/GameStatus';

describe('Game entity', () => {
    it('creates a new game with default configuration', () => {
        const game = Game.create({ playerId: 'player1', mode: 'classic', config: {} });
        expect(game.players).toHaveLength(1);
        expect(game.status).toBe(GameStatus.WAITING);
    });
});
