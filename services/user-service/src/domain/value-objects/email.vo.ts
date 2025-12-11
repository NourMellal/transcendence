import { DomainError } from '../errors/domain.error';

export class Email {
    private readonly value: string;

    constructor(email: string) {
        const normalized = email?.trim().toLowerCase();
        if (!normalized) {
            throw new DomainError('Email is required');
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(normalized)) {
            throw new DomainError('Invalid email format');
        }

        this.value = normalized;
    }

    toString(): string {
        return this.value;
    }

    equals(other: Email): boolean {
        return this.value === other.toString();
    }
}
