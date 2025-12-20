import { TournamentMatchStatus } from '../types';

export interface TournamentMatch {
    id: string;
    tournamentId: string;
    round: number;
    matchPosition: number;
    player1Id?: string | null;
    player2Id?: string | null;
    gameId?: string | null;
    winnerId?: string | null;
    status: TournamentMatchStatus;
    createdAt: Date;
    startedAt?: Date | null;
    finishedAt?: Date | null;
}
