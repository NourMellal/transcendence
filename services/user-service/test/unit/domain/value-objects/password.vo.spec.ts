import { describe, expect, it } from 'vitest';
import { Password } from '../../../../src/domain/value-objects/password.vo';
import { DomainError } from '../../../../src/domain/errors/domain.error';

describe('Password Value Object', () => {
    it('accepts strong passwords', () => {
        const password = new Password('Abcdef1!');
        expect(password.toString()).toBe('Abcdef1!');
    });

    it('rejects passwords missing complexity requirements', () => {
        expect(() => new Password('abcdefg1')).toThrow(DomainError);
        expect(() => new Password('ABCDEFG!')).toThrow(DomainError);
        expect(() => new Password('ABCdefgh')).toThrow(DomainError);
    });

    it('requires minimum length', () => {
        expect(() => new Password('Ab1!')).toThrow('Password must be at least 8 characters long');
    });
});
