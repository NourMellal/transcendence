import { GameMode } from '../../domain/entities';

export interface CreateGameInput {
    readonly playerId: string;
    readonly opponentId?: string;
    readonly mode: GameMode;
    readonly tournamentId?: string;
    readonly matchId?: string;
  readonly isPrivate?: boolean;
    readonly config?: {
        readonly arenaWidth?: number;
        readonly arenaHeight?: number;
        readonly scoreLimit?: number;
        readonly paddleSpeed?: number;
        readonly ballSpeed?: number;
    };
}
