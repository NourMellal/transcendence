import { DomainError } from './DomainError';

export class GameNotFoundError extends DomainError {
    constructor(gameId: string) {
        super(`Game ${gameId} was not found`);
        this.name = 'GameNotFoundError';
    }
}
