import { describe, expect, it } from 'vitest';
import { UserId } from '../../../../src/domain/value-objects/user-id.vo';
import { DomainError } from '../../../../src/domain/errors/domain.error';

describe('UserId Value Object', () => {
    it('stores trimmed identifier', () => {
        const id = new UserId(' 123 ');
        expect(id.toString()).toBe('123');
    });

    it('throws when empty', () => {
        expect(() => new UserId('')).toThrow(DomainError);
    });
});
