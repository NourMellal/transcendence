import { Game, GameMode } from '../../../domain/entities';
import { GameStatus } from '../../../domain/value-objects';

export interface ListGamesParams {
    readonly status?: GameStatus;
    readonly mode?: GameMode;
    readonly playerId?: string;
}

export interface IGameRepository {
    create(game: Game): Promise<void>;
    update(game: Game): Promise<void>;
    findById(id: string): Promise<Game | null>;
    list(params?: ListGamesParams): Promise<Game[]>;
    findActiveByPlayer(playerId: string): Promise<Game | null>;
}
