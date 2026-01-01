import crypto from 'crypto';
import { TournamentMatchStatus } from '../../domain/types';
import { Errors } from '../errors';
import {
    TournamentBracketStateRepository,
    TournamentMatchRepository,
    TournamentParticipantRepository,
    TournamentRepository,
    UnitOfWork
} from '../../domain/repositories';
import { ITournamentEventPublisher } from '../ports/messaging/ITournamentEventPublisher';
import { Tournament, TournamentMatch, TournamentParticipant } from '../../domain/entities';

export interface CompleteMatchCommand {
    tournamentId: string;
    matchId?: string;
    gameId?: string;
    winnerId: string;
    finishedAt?: Date;
}

export class CompleteMatchUseCase {
    constructor(
        private readonly tournaments: TournamentRepository,
        private readonly participantsRepo: TournamentParticipantRepository,
        private readonly matches: TournamentMatchRepository,
        private readonly bracketStates: TournamentBracketStateRepository,
        private readonly unitOfWork: UnitOfWork,
        private readonly publisher?: ITournamentEventPublisher
    ) {}

    async execute(command: CompleteMatchCommand): Promise<void> {
        const match = await this.findMatch(command);
        if (!match || match.tournamentId !== command.tournamentId) {
            throw Errors.notFound('Match not found for completed game');
        }

        const tournament = await this.tournaments.findById(match.tournamentId);
        if (!tournament) {
            throw Errors.notFound('Tournament not found');
        }

        if (tournament.status !== 'in_progress') {
            throw Errors.conflict('Tournament not in progress');
        }

        const matches = await this.matches.listByTournamentId(tournament.id);
        const maxRound = Math.max(...matches.map((m) => m.round));
        const finishedAt = command.finishedAt ?? new Date();

        if (!this.isValidWinner(match, command.winnerId)) {
            throw Errors.badRequest('Winner does not belong to the match');
        }

        const updatedMatch: TournamentMatch = {
            ...match,
            gameId: command.gameId ?? match.gameId ?? null,
            winnerId: command.winnerId,
            status: 'finished',
            finishedAt
        };

        const nextMatch = this.findNextMatch(matches, match);
        if (nextMatch) {
            const updatedNext = { ...nextMatch };
            const targetSlot = match.matchPosition % 2 === 1 ? 'player1Id' : 'player2Id';
            if (!updatedNext[targetSlot]) {
                (updatedNext as any)[targetSlot] = command.winnerId;
            }
            const snapshotMatches = matches.map((m) => {
                if (m.id === match.id) return updatedMatch;
                if (m.id === nextMatch.id) return updatedNext;
                return m;
            });
            await this.persistUpdates(
                tournament.id,
                updatedMatch,
                [updatedNext],
                tournament,
                false,
                [],
                undefined,
                undefined,
                snapshotMatches
            );
            return;
        }

        if (match.round === maxRound) {
            const participants = await this.participantsRepo.listByTournamentId(tournament.id);
            const runnerUp = this.resolveRunnerUp(match, command.winnerId);

            const snapshotMatches = matches.map((m) => {
                if (m.id === match.id) return updatedMatch;
                return m;
            });

            await this.persistUpdates(
                tournament.id,
                updatedMatch,
                [],
                {
                    ...tournament,
                    status: 'finished',
                    finishedAt,
                    updatedAt: finishedAt
                },
                true,
                participants,
                command.winnerId,
                runnerUp,
                snapshotMatches
            );
            return;
        }

        const snapshotMatches = matches.map((m) => (m.id === match.id ? updatedMatch : m));
        await this.persistUpdates(
            tournament.id,
            updatedMatch,
            [],
            tournament,
            false,
            [],
            undefined,
            undefined,
            snapshotMatches
        );
    }

    private async findMatch(command: CompleteMatchCommand) {
        if (command.matchId) {
            return this.matches.findById(command.matchId);
        }
        if (command.gameId) {
            return this.matches.findByGameId(command.gameId);
        }
        return null;
    }

    private findNextMatch(allMatches: TournamentMatch[], match: TournamentMatch): TournamentMatch | null {
        const nextRound = match.round + 1;
        const nextPosition = Math.ceil(match.matchPosition / 2);
        return allMatches.find(
            (m) => m.round === nextRound && m.matchPosition === nextPosition
        ) ?? null;
    }

    private resolveRunnerUp(match: TournamentMatch, winnerId: string): string {
        if (match.player1Id === winnerId) {
            return match.player2Id ?? '';
        }
        if (match.player2Id === winnerId) {
            return match.player1Id ?? '';
        }
        return '';
    }

    private isValidWinner(match: TournamentMatch, winnerId: string): boolean {
        return match.player1Id === winnerId || match.player2Id === winnerId;
    }

    private async persistUpdates(
        tournamentId: string,
        match: TournamentMatch,
        otherMatches: TournamentMatch[],
        tournament: Tournament,
        isFinal: boolean,
        participants: TournamentParticipant[] = [],
        winnerId?: string,
        runnerUpId?: string,
        snapshotMatches: TournamentMatch[] = []
    ) {
        const now = new Date();
        const latestVersion = await this.bracketStates.getLatest(tournamentId);
        const version = latestVersion ? latestVersion.version + 1 : 1;
        const matches = snapshotMatches.length ? snapshotMatches : [match, ...otherMatches];

        await this.unitOfWork.withTransaction(async () => {
            await this.matches.update(match);
            for (const m of otherMatches) {
                await this.matches.update(m);
            }

            await this.bracketStates.save({
                id: crypto.randomUUID(),
                tournamentId,
                bracketJson: JSON.stringify({
                    matches: matches.map((m) => ({
                        id: m.id,
                        round: m.round,
                        matchPosition: m.matchPosition,
                        player1Id: m.player1Id ?? null,
                        player2Id: m.player2Id ?? null,
                        winnerId: m.winnerId ?? null,
                        status: m.status
                    }))
                }),
                version,
                createdAt: now
            });

            await this.tournaments.update(tournament);
        });

        if (isFinal && winnerId && runnerUpId && this.publisher?.publishTournamentFinished) {
            await this.publisher.publishTournamentFinished(
                tournament,
                winnerId,
                runnerUpId,
                participants
            );
        }
    }
}
