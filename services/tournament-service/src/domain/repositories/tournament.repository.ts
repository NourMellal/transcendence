import {
    Tournament,
    TournamentBracketState,
    TournamentMatch,
    TournamentParticipant
} from '../entities';
import {
    TournamentMatchStatus,
    TournamentStatus,
    TournamentParticipantStatus
} from '../types';

export interface TournamentRepository {
    findById(id: string): Promise<Tournament | null>;
    listByStatus(status?: TournamentStatus): Promise<Tournament[]>;
    listByUser(userId: string, status?: TournamentStatus): Promise<Tournament[]>;
    findReadyForTimeout(cutoff: Date): Promise<Tournament[]>;
    create(tournament: Tournament): Promise<void>;
    update(tournament: Tournament): Promise<void>;
    delete(id: string): Promise<void>;
    incrementParticipantCount(id: string): Promise<void>;
    setParticipantCount(id: string, count: number): Promise<void>;
    setReadyState(id: string, readyToStart: boolean, startTimeoutAt: Date | null): Promise<void>;
}

export interface TournamentParticipantRepository {
    findByTournamentAndUser(tournamentId: string, userId: string): Promise<TournamentParticipant | null>;
    listByTournamentId(tournamentId: string): Promise<TournamentParticipant[]>;
    countByTournamentId(tournamentId: string): Promise<number>;
    add(participant: TournamentParticipant): Promise<void>;
    removeByTournamentAndUser(tournamentId: string, userId: string): Promise<void>;
    removeByTournamentId(tournamentId: string): Promise<void>;
    updateStatus(
        id: string,
        status: TournamentParticipantStatus
    ): Promise<void>;
}

export interface TournamentMatchRepository {
    findById(id: string): Promise<TournamentMatch | null>;
    findByGameId(gameId: string): Promise<TournamentMatch | null>;
    listByTournamentId(tournamentId: string): Promise<TournamentMatch[]>;
    createMany(matches: TournamentMatch[]): Promise<void>;
    update(match: TournamentMatch): Promise<void>;
    updateStatus(id: string, status: TournamentMatchStatus, winnerId?: string | null): Promise<void>;
    removeByTournamentId(tournamentId: string): Promise<void>;
}

export interface TournamentBracketStateRepository {
    save(snapshot: TournamentBracketState): Promise<void>;
    getLatest(tournamentId: string): Promise<TournamentBracketState | null>;
    removeByTournamentId(tournamentId: string): Promise<void>;
}

export interface UnitOfWork {
    withTransaction<T>(handler: () => Promise<T>): Promise<T>;
}
