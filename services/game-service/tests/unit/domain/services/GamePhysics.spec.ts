import { describe, it, expect } from 'vitest';
import { Game } from '../../../../src/domain/entities/Game';
import { GamePhysics } from '../../../../src/domain/services/GamePhysics';
import { CollisionDetector } from '../../../../src/domain/services/CollisionDetector';

describe('GamePhysics', () => {
    it('updates ball position each tick', () => {
        const game = Game.create({ playerId: 'player', opponentId: 'opponent', mode: 'classic', config: {} });
        game.start();
        const physics = new GamePhysics(new CollisionDetector());
        const originalX = game.ball.position.x;
        physics.advance(game, 1);
        expect(game.ball.position.x).not.toBe(originalX);
    });
});
