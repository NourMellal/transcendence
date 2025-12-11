import { DomainError } from './DomainError';

export class InvalidGameStateError extends DomainError {
    constructor(message: string) {
        super(message);
        this.name = 'InvalidGameStateError';
    }
}
