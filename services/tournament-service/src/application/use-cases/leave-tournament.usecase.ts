import { LeaveTournamentCommand } from '../dto/leave-tournament.dto';
import {
    TournamentBracketStateRepository,
    TournamentMatchRepository,
    TournamentParticipantRepository,
    TournamentRepository,
    UnitOfWork
} from '../../domain/repositories';
import { Tournament } from '../../domain/entities';
import { Errors } from '../errors';

export interface LeaveTournamentConfig {
    minParticipants: number;
    maxParticipants: number;
    autoStartTimeoutSeconds: number;
}

export interface LeaveTournamentResult {
    participantCount: number;
    readyToStart: boolean;
    startTimeoutAt: Date | null;
    tournamentDeleted?: boolean;
}

export class LeaveTournamentUseCase {
    constructor(
        private readonly tournaments: TournamentRepository,
        private readonly participants: TournamentParticipantRepository,
        private readonly matches: TournamentMatchRepository,
        private readonly brackets: TournamentBracketStateRepository,
        private readonly unitOfWork: UnitOfWork,
        private readonly config: LeaveTournamentConfig
    ) {}

    async execute(command: LeaveTournamentCommand): Promise<LeaveTournamentResult> {
        if (!command.userId) {
            throw Errors.unauthorized('userId is required');
        }

        const tournament = await this.tournaments.findById(command.tournamentId);
        if (!tournament) {
            throw Errors.notFound('Tournament not found');
        }

        this.ensureRecruiting(tournament);

        const participant = await this.participants.findByTournamentAndUser(tournament.id, command.userId);
        if (!participant) {
            throw Errors.badRequest('User is not a participant');
        }

        if (tournament.creatorId === command.userId) {
            await this.unitOfWork.withTransaction(async () => {
                await this.participants.removeByTournamentId(tournament.id);
                await this.matches.removeByTournamentId(tournament.id);
                await this.brackets.removeByTournamentId(tournament.id);
                await this.tournaments.delete(tournament.id);
            });

            return {
                participantCount: 0,
                readyToStart: false,
                startTimeoutAt: null,
                tournamentDeleted: true
            };
        }

        const now = new Date();
        let participantCount = 0;
        let readyToStart = false;
        let startTimeoutAt: Date | null = null;

        await this.unitOfWork.withTransaction(async () => {
            await this.participants.removeByTournamentAndUser(tournament.id, command.userId);
            participantCount = await this.participants.countByTournamentId(tournament.id);

            const computed = this.computeReadyState(tournament, participantCount, now);
            readyToStart = computed.readyToStart;
            startTimeoutAt = computed.startTimeoutAt;

            await this.tournaments.setParticipantCount(tournament.id, participantCount);
            await this.tournaments.setReadyState(tournament.id, readyToStart, startTimeoutAt);
        });

        return {
            participantCount,
            readyToStart,
            startTimeoutAt
        };
    }

    private ensureRecruiting(tournament: Tournament) {
        if (tournament.status !== 'recruiting') {
            throw Errors.badRequest('Tournament is not recruiting');
        }
    }

    private computeReadyState(
        tournament: Tournament,
        participantCount: number,
        now: Date
    ): { readyToStart: boolean; startTimeoutAt: Date | null } {
        if (participantCount < this.config.minParticipants) {
            return { readyToStart: false, startTimeoutAt: null };
        }

        if (participantCount >= this.config.maxParticipants) {
            return { readyToStart: true, startTimeoutAt: null };
        }

        const startTimeoutAt =
            tournament.startTimeoutAt ?? new Date(now.getTime() + this.config.autoStartTimeoutSeconds * 1000);

        return { readyToStart: true, startTimeoutAt };
    }
}
