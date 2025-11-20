import { Game } from '../../../domain/entities';

export interface IGameEventPublisher {
    publishGameCreated(game: Game): Promise<void>;
    publishGameStarted(game: Game): Promise<void>;
    publishGameFinished(game: Game): Promise<void>;
}
