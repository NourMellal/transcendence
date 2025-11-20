import { describe, expect, it } from 'vitest';
import { Username } from '../../../../src/domain/value-objects/username.vo';
import { DomainError } from '../../../../src/domain/errors/domain.error';

describe('Username Value Object', () => {
    it('accepts valid usernames', () => {
        const username = new Username('player_one');
        expect(username.toString()).toBe('player_one');
    });

    it('throws when username is missing', () => {
        expect(() => new Username('  ')).toThrow(DomainError);
    });

    it('throws when username is too short', () => {
        expect(() => new Username('ab')).toThrow('Username must be 3-20 characters and contain only letters, numbers, underscores, or hyphens');
    });

    it('throws when username has invalid characters', () => {
        expect(() => new Username('bad!name')).toThrow(DomainError);
    });
});
