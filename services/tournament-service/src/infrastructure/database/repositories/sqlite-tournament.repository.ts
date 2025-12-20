import { TournamentDatabase } from '../connection';
import {
    Tournament,
    TournamentBracketState,
    TournamentMatch,
    TournamentParticipant
} from '../../../domain/entities';
import {
    TournamentBracketStateRepository,
    TournamentMatchRepository,
    TournamentParticipantRepository,
    TournamentRepository
} from '../../../domain/repositories';
import {
    TournamentMatchStatus,
    TournamentParticipantStatus,
    TournamentStatus
} from '../../../domain/types';

type NullableDate = Date | null | undefined;

function toDate(value: string | null | undefined): NullableDate {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function mapTournament(row: any): Tournament {
    return {
        id: row.id,
        name: row.name,
        creatorId: row.creator_id,
        status: row.status as TournamentStatus,
        bracketType: row.bracket_type,
        maxParticipants: Number(row.max_participants),
        minParticipants: Number(row.min_participants),
        currentParticipants: Number(row.current_participants),
        isPublic: Boolean(row.is_public),
        accessCode: row.access_code ?? null,
        passcodeHash: row.passcode_hash ?? null,
        readyToStart: Boolean(row.ready_to_start),
        readyAt: toDate(row.ready_at),
        startTimeoutAt: toDate(row.start_timeout_at),
        createdAt: new Date(row.created_at),
        startedAt: toDate(row.started_at),
        finishedAt: toDate(row.finished_at),
        updatedAt: new Date(row.updated_at)
    };
}

function mapParticipant(row: any): TournamentParticipant {
    return {
        id: row.id,
        tournamentId: row.tournament_id,
        userId: row.user_id,
        status: row.status as TournamentParticipantStatus,
        joinedAt: new Date(row.joined_at)
    };
}

function mapMatch(row: any): TournamentMatch {
    return {
        id: row.id,
        tournamentId: row.tournament_id,
        round: Number(row.round),
        matchPosition: Number(row.match_position),
        player1Id: row.player1_id ?? null,
        player2Id: row.player2_id ?? null,
        gameId: row.game_id ?? null,
        winnerId: row.winner_id ?? null,
        status: row.status as TournamentMatchStatus,
        createdAt: new Date(row.created_at),
        startedAt: toDate(row.started_at),
        finishedAt: toDate(row.finished_at)
    };
}

function mapBracketState(row: any): TournamentBracketState {
    return {
        id: row.id,
        tournamentId: row.tournament_id,
        bracketJson: row.bracket_json,
        version: Number(row.version),
        createdAt: new Date(row.created_at)
    };
}

export class SQLiteTournamentRepository implements TournamentRepository {
    constructor(private readonly db: TournamentDatabase) {}

    async findById(id: string): Promise<Tournament | null> {
        const row = await this.db.get('SELECT * FROM tournaments WHERE id = ?', id);
        return row ? mapTournament(row) : null;
    }

    async listByStatus(status?: TournamentStatus): Promise<Tournament[]> {
        const rows = status
            ? await this.db.all('SELECT * FROM tournaments WHERE status = ? ORDER BY created_at DESC', status)
            : await this.db.all('SELECT * FROM tournaments ORDER BY created_at DESC');

        return rows.map(mapTournament);
    }

    async findReadyForTimeout(cutoff: Date): Promise<Tournament[]> {
        const rows = await this.db.all(
            `
            SELECT *
            FROM tournaments
            WHERE status = 'recruiting'
              AND ready_to_start = 1
              AND start_timeout_at IS NOT NULL
              AND start_timeout_at <= ?
            ORDER BY start_timeout_at ASC
        `,
            cutoff.toISOString()
        );

        return rows.map(mapTournament);
    }

    async create(tournament: Tournament): Promise<void> {
        await this.db.run(
            `
            INSERT INTO tournaments (
                id, name, creator_id, status, bracket_type,
                max_participants, min_participants, current_participants,
                is_public, access_code, passcode_hash,
                ready_to_start, ready_at, start_timeout_at,
                created_at, started_at, finished_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
            tournament.id,
            tournament.name,
            tournament.creatorId,
            tournament.status,
            tournament.bracketType,
            tournament.maxParticipants,
            tournament.minParticipants,
            tournament.currentParticipants,
            tournament.isPublic ? 1 : 0,
            tournament.accessCode ?? null,
            tournament.passcodeHash ?? null,
            tournament.readyToStart ? 1 : 0,
            tournament.readyAt ? tournament.readyAt.toISOString() : null,
            tournament.startTimeoutAt ? tournament.startTimeoutAt.toISOString() : null,
            tournament.createdAt.toISOString(),
            tournament.startedAt ? tournament.startedAt.toISOString() : null,
            tournament.finishedAt ? tournament.finishedAt.toISOString() : null,
            tournament.updatedAt.toISOString()
        );
    }

    async update(tournament: Tournament): Promise<void> {
        await this.db.run(
            `
            UPDATE tournaments
            SET
                name = ?,
                status = ?,
                bracket_type = ?,
                max_participants = ?,
                min_participants = ?,
                current_participants = ?,
                is_public = ?,
                access_code = ?,
                passcode_hash = ?,
                ready_to_start = ?,
                ready_at = ?,
                start_timeout_at = ?,
                started_at = ?,
                finished_at = ?,
                updated_at = ?
            WHERE id = ?
        `,
            tournament.name,
            tournament.status,
            tournament.bracketType,
            tournament.maxParticipants,
            tournament.minParticipants,
            tournament.currentParticipants,
            tournament.isPublic ? 1 : 0,
            tournament.accessCode ?? null,
            tournament.passcodeHash ?? null,
            tournament.readyToStart ? 1 : 0,
            tournament.readyAt ? tournament.readyAt.toISOString() : null,
            tournament.startTimeoutAt ? tournament.startTimeoutAt.toISOString() : null,
            tournament.startedAt ? tournament.startedAt.toISOString() : null,
            tournament.finishedAt ? tournament.finishedAt.toISOString() : null,
            new Date().toISOString(),
            tournament.id
        );
    }

    async incrementParticipantCount(id: string): Promise<void> {
        await this.db.run(
            `
            UPDATE tournaments
            SET current_participants = current_participants + 1,
                updated_at = datetime('now')
            WHERE id = ?
        `,
            id
        );
    }

    async setReadyState(id: string, readyToStart: boolean, startTimeoutAt: Date | null): Promise<void> {
        await this.db.run(
            `
            UPDATE tournaments
            SET
                ready_to_start = ?,
                ready_at = CASE WHEN ? = 1 AND ready_at IS NULL THEN datetime('now') ELSE ready_at END,
                start_timeout_at = ?
            WHERE id = ?
        `,
            readyToStart ? 1 : 0,
            readyToStart ? 1 : 0,
            startTimeoutAt ? startTimeoutAt.toISOString() : null,
            id
        );
    }
}

export class SQLiteTournamentParticipantRepository implements TournamentParticipantRepository {
    constructor(private readonly db: TournamentDatabase) {}

    async findByTournamentAndUser(tournamentId: string, userId: string): Promise<TournamentParticipant | null> {
        const row = await this.db.get(
            'SELECT * FROM tournament_participants WHERE tournament_id = ? AND user_id = ?',
            tournamentId,
            userId
        );
        return row ? mapParticipant(row) : null;
    }

    async listByTournamentId(tournamentId: string): Promise<TournamentParticipant[]> {
        const rows = await this.db.all(
            'SELECT * FROM tournament_participants WHERE tournament_id = ? ORDER BY joined_at ASC',
            tournamentId
        );
        return rows.map(mapParticipant);
    }

    async countByTournamentId(tournamentId: string): Promise<number> {
        const row = await this.db.get(
            'SELECT COUNT(*) as count FROM tournament_participants WHERE tournament_id = ?',
            tournamentId
        );
        return row ? Number(row.count) : 0;
    }

    async add(participant: TournamentParticipant): Promise<void> {
        await this.db.run(
            `
            INSERT INTO tournament_participants (id, tournament_id, user_id, joined_at, status)
            VALUES (?, ?, ?, ?, ?)
        `,
            participant.id,
            participant.tournamentId,
            participant.userId,
            participant.joinedAt.toISOString(),
            participant.status
        );
    }

    async updateStatus(id: string, status: TournamentParticipantStatus): Promise<void> {
        await this.db.run(
            `
            UPDATE tournament_participants
            SET status = ?
            WHERE id = ?
        `,
            status,
            id
        );
    }
}

export class SQLiteTournamentMatchRepository implements TournamentMatchRepository {
    constructor(private readonly db: TournamentDatabase) {}

    async findById(id: string): Promise<TournamentMatch | null> {
        const row = await this.db.get('SELECT * FROM tournament_matches WHERE id = ?', id);
        return row ? mapMatch(row) : null;
    }

    async findByGameId(gameId: string): Promise<TournamentMatch | null> {
        const row = await this.db.get('SELECT * FROM tournament_matches WHERE game_id = ?', gameId);
        return row ? mapMatch(row) : null;
    }

    async listByTournamentId(tournamentId: string): Promise<TournamentMatch[]> {
        const rows = await this.db.all(
            'SELECT * FROM tournament_matches WHERE tournament_id = ? ORDER BY round ASC, match_position ASC',
            tournamentId
        );
        return rows.map(mapMatch);
    }

    async createMany(matches: TournamentMatch[]): Promise<void> {
        const stmt = await this.db.prepare(
            `
            INSERT INTO tournament_matches (
                id, tournament_id, round, match_position, player1_id, player2_id,
                game_id, winner_id, status, created_at, started_at, finished_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
        );

        try {
            for (const match of matches) {
                await stmt.run(
                    match.id,
                    match.tournamentId,
                    match.round,
                    match.matchPosition,
                    match.player1Id ?? null,
                    match.player2Id ?? null,
                    match.gameId ?? null,
                    match.winnerId ?? null,
                    match.status,
                    match.createdAt.toISOString(),
                    match.startedAt ? match.startedAt.toISOString() : null,
                    match.finishedAt ? match.finishedAt.toISOString() : null
                );
            }
        } finally {
            await stmt.finalize();
        }
    }

    async update(match: TournamentMatch): Promise<void> {
        await this.db.run(
            `
            UPDATE tournament_matches
            SET
                player1_id = ?,
                player2_id = ?,
                game_id = ?,
                winner_id = ?,
                status = ?,
                started_at = ?,
                finished_at = ?
            WHERE id = ?
        `,
            match.player1Id ?? null,
            match.player2Id ?? null,
            match.gameId ?? null,
            match.winnerId ?? null,
            match.status,
            match.startedAt ? match.startedAt.toISOString() : null,
            match.finishedAt ? match.finishedAt.toISOString() : null,
            match.id
        );
    }

    async updateStatus(id: string, status: TournamentMatchStatus, winnerId?: string | null): Promise<void> {
        await this.db.run(
            `
            UPDATE tournament_matches
            SET status = ?, winner_id = ?
            WHERE id = ?
        `,
            status,
            winnerId ?? null,
            id
        );
    }
}

export class SQLiteTournamentBracketStateRepository implements TournamentBracketStateRepository {
    constructor(private readonly db: TournamentDatabase) {}

    async save(snapshot: TournamentBracketState): Promise<void> {
        await this.db.run(
            `
            INSERT INTO tournament_bracket_states (id, tournament_id, bracket_json, version, created_at)
            VALUES (?, ?, ?, ?, ?)
        `,
            snapshot.id,
            snapshot.tournamentId,
            snapshot.bracketJson,
            snapshot.version,
            snapshot.createdAt.toISOString()
        );
    }

    async getLatest(tournamentId: string): Promise<TournamentBracketState | null> {
        const row = await this.db.get(
            `
            SELECT * FROM tournament_bracket_states
            WHERE tournament_id = ?
            ORDER BY version DESC
            LIMIT 1
        `,
            tournamentId
        );
        return row ? mapBracketState(row) : null;
    }
}
