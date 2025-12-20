import crypto from 'crypto';
import { TournamentMatch, TournamentParticipant } from '../../domain/entities';

export interface GeneratedBracket {
    matches: TournamentMatch[];
    snapshot: {
        size: number;
        rounds: number;
        seeds: Array<{ userId: string; username?: string }>;
        matches: Array<{
            id: string;
            round: number;
            matchPosition: number;
            player1Id: string | null;
            player2Id: string | null;
        }>;
    };
}

export interface BracketGeneratorConfig {
    minParticipants: number;
    maxParticipants: number;
}

/**
 * Generates a deterministic single-elimination bracket with stable
 * round/matchPosition identifiers. We only support 4- or 8-player brackets
 * for the MVP based on the participant count at start time.
 */
export class BracketGenerator {
    constructor(private readonly config: BracketGeneratorConfig) {}

    generate(
        tournamentId: string,
        participants: TournamentParticipant[]
    ): GeneratedBracket {
        const now = new Date();
        const shuffled = this.shuffle(participants);
        const size = this.resolveBracketSize(shuffled.length);
        const seeds = shuffled.slice(0, size);

        const totalRounds = Math.log2(size);
        const matches: TournamentMatch[] = [];
        const snapshotMatches: GeneratedBracket['snapshot']['matches'] = [];

        // Round 1: fill with seeded participants
        let matchPosition = 1;
        for (let i = 0; i < seeds.length; i += 2) {
            const player1 = seeds[i];
            const player2 = seeds[i + 1];
            const matchId = crypto.randomUUID();

            matches.push({
                id: matchId,
                tournamentId,
                round: 1,
                matchPosition,
                player1Id: player1?.userId ?? null,
                player2Id: player2?.userId ?? null,
                status: 'pending',
                createdAt: now,
                startedAt: null,
                finishedAt: null,
                gameId: null,
                winnerId: null
            });

            snapshotMatches.push({
                id: matchId,
                round: 1,
                matchPosition,
                player1Id: player1?.userId ?? null,
                player2Id: player2?.userId ?? null
            });

            matchPosition += 1;
        }

        // Later rounds: empty slots that will be filled by winners
        for (let round = 2; round <= totalRounds; round += 1) {
            const matchesInRound = Math.pow(2, totalRounds - round);
            for (let position = 1; position <= matchesInRound; position += 1) {
                const matchId = crypto.randomUUID();
                matches.push({
                    id: matchId,
                    tournamentId,
                    round,
                    matchPosition: position,
                    player1Id: null,
                    player2Id: null,
                    status: 'pending',
                    createdAt: now,
                    startedAt: null,
                    finishedAt: null,
                    gameId: null,
                    winnerId: null
                });

                snapshotMatches.push({
                    id: matchId,
                    round,
                    matchPosition: position,
                    player1Id: null,
                    player2Id: null
                });
            }
        }

        return {
            matches,
            snapshot: {
                size,
                rounds: totalRounds,
                seeds: seeds.map((p) => ({ userId: p.userId, username: p.username })),
                matches: snapshotMatches
            }
        };
    }

    private shuffle(list: TournamentParticipant[]): TournamentParticipant[] {
        const copy = [...list];
        for (let i = copy.length - 1; i > 0; i -= 1) {
            const j = crypto.randomInt(i + 1);
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    }

    private resolveBracketSize(count: number): number {
        if (count >= this.config.maxParticipants) {
            return this.config.maxParticipants;
        }
        return this.config.minParticipants;
    }
}
