import { DomainError } from '../errors/domain.error';

export class DisplayName {
    private readonly value: string;

    constructor(displayName: string) {
        const normalized = displayName?.trim();

        if (normalized === undefined) {
            throw new DomainError('Display name is required');
        }

        if (normalized.length < 1 || normalized.length > 50) {
            throw new DomainError('Display name must be between 1 and 50 characters');
        }

        this.value = normalized;
    }

    toString(): string {
        return this.value;
    }

    equals(other: DisplayName): boolean {
        return this.value === other.toString();
    }
}
