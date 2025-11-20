import { describe, it, expect } from 'vitest';
import { CollisionDetector } from '../../../../src/domain/services/CollisionDetector';
import { Ball, Game } from '../../../../src/domain/entities';
import { Position, Velocity } from '../../../../src/domain/value-objects';

describe('CollisionDetector', () => {
    it('detects wall collision', () => {
        const detector = new CollisionDetector();
        const game = Game.create({ playerId: 'player', opponentId: 'opponent', mode: 'classic', config: {} });
        const ball = Ball.create(Position.create(0, 0), Velocity.create(-5, -5));
        const outcome = detector.detect(ball, game);
        expect(outcome.reflectsY).toBe(true);
    });
});
