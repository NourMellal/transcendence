import { GameMode, GamePlayerState, GameConfig } from '../../domain/entities';
import { GameStatus } from '../../domain/value-objects';

export interface GameStateOutput {
    readonly id: string;
    readonly status: GameStatus;
    readonly mode: GameMode;
    readonly players: GamePlayerState[];
    readonly score: { player1: number; player2: number };
    readonly config: GameConfig;
    readonly createdAt: Date;
    readonly updatedAt: Date;
  readonly startedAt?: Date;
  readonly finishedAt?: Date;
}
