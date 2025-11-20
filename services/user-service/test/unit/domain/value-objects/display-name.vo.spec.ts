import { describe, expect, it } from 'vitest';
import { DisplayName } from '../../../../src/domain/value-objects/display-name.vo';
import { DomainError } from '../../../../src/domain/errors/domain.error';

describe('DisplayName Value Object', () => {
    it('trims and stores provided display name', () => {
        const displayName = new DisplayName('  Player One  ');
        expect(displayName.toString()).toBe('Player One');
    });

    it('throws when shorter than 1 character', () => {
        expect(() => new DisplayName('')).toThrow(DomainError);
    });

    it('throws when longer than 50 characters', () => {
        const longName = 'a'.repeat(51);
        expect(() => new DisplayName(longName)).toThrow(DomainError);
    });
});
