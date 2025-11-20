import { DomainError } from '../errors/domain.error';

export class Username {
    private readonly value: string;

    constructor(username: string) {
        const normalized = username?.trim();
        if (!normalized) {
            throw new DomainError('Username is required');
        }

        const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
        if (!usernameRegex.test(normalized)) {
            throw new DomainError('Username must be 3-20 characters and contain only letters, numbers, underscores, or hyphens');
        }

        this.value = normalized;
    }

    toString(): string {
        return this.value;
    }

    equals(other: Username): boolean {
        return this.value === other.toString();
    }
}
