import { describe, it, expect } from 'vitest';
import { Paddle } from '../../../../src/domain/entities/Paddle';
import { Position } from '../../../../src/domain/value-objects/Position';

describe('Paddle entity', () => {
    it('moves vertically when delta applied', () => {
        const paddle = Paddle.create(Position.create(0, 10), 80, 10);
        const moved = paddle.move(5);
        expect(moved.position.y).toBe(15);
    });
});
