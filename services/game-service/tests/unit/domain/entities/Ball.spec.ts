import { describe, it, expect } from 'vitest';
import { Ball } from '../../../../src/domain/entities/Ball';
import { Position, Velocity } from '../../../../src/domain/value-objects';

describe('Ball entity', () => {
    it('moves using velocity and delta time', () => {
        const ball = Ball.create(Position.create(0, 0), Velocity.create(1, 1));
        const moved = ball.move(5);
        expect(moved.position.x).toBe(5);
        expect(moved.position.y).toBe(5);
    });
});
