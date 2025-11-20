import { DomainError } from '../errors/domain.error';

export class UserId {
    private readonly value: string;

    constructor(id: string) {
        const normalized = id?.trim();
        if (!normalized) {
            throw new DomainError('User ID cannot be empty');
        }

        this.value = normalized;
    }

    toString(): string {
        return this.value;
    }

    equals(other: UserId): boolean {
        return this.value === other.toString();
    }
}
