import { describe, expect, it } from 'vitest';
import { Email } from '../../../../src/domain/value-objects/email.vo';
import { DomainError } from '../../../../src/domain/errors/domain.error';

describe('Email Value Object', () => {
    it('creates a normalized email', () => {
        const email = new Email('User@Example.com ');
        expect(email.toString()).toBe('user@example.com');
    });

    it('compares equality case-insensitively', () => {
        const emailA = new Email('test@example.com');
        const emailB = new Email('TEST@example.com');
        expect(emailA.equals(emailB)).toBe(true);
    });

    it('throws for invalid email format', () => {
        expect(() => new Email('invalid')).toThrow(DomainError);
    });

    it('throws when email is empty', () => {
        expect(() => new Email('  ')).toThrow('Email is required');
    });
});
