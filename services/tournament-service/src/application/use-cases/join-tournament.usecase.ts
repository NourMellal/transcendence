import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { JoinTournamentCommand } from '../dto/join-tournament.dto';
import {
    TournamentParticipantRepository,
    TournamentRepository,
    UnitOfWork
} from '../../domain/repositories';
import { Tournament } from '../../domain/entities';
import { Errors } from '../errors';
import { ITournamentEventPublisher } from '../ports/messaging/ITournamentEventPublisher';

export interface JoinTournamentConfig {
    minParticipants: number;
    maxParticipants: number;
    autoStartTimeoutSeconds: number;
}

export class JoinTournamentUseCase {
    constructor(
        private readonly tournaments: TournamentRepository,
        private readonly participants: TournamentParticipantRepository,
        private readonly unitOfWork: UnitOfWork,
        private readonly config: JoinTournamentConfig,
        private readonly publisher?: ITournamentEventPublisher
    ) {}

    async execute(command: JoinTournamentCommand) {
        if (!command.userId) {
            throw Errors.unauthorized('userId is required');
        }

        const tournament = await this.tournaments.findById(command.tournamentId);
        if (!tournament) {
            throw Errors.notFound('Tournament not found');
        }

        this.ensureRecruiting(tournament);

        const alreadyJoined = await this.participants.findByTournamentAndUser(tournament.id, command.userId);
        if (alreadyJoined) {
            throw Errors.conflict('Already joined');
        }

        await this.ensurePasscodeIfNeeded(tournament, command.passcode);

        if (tournament.currentParticipants >= this.config.maxParticipants) {
            throw Errors.conflict('Tournament is full');
        }

        const nextCount = tournament.currentParticipants + 1;
        const now = new Date();
        const shouldSetReady = nextCount >= this.config.minParticipants;
        const willAutoStart = nextCount >= this.config.maxParticipants;
        const startTimeoutAt =
            shouldSetReady && nextCount < this.config.maxParticipants
                ? new Date(now.getTime() + this.config.autoStartTimeoutSeconds * 1000)
                : null;

        const participant = {
            id: crypto.randomUUID(),
            tournamentId: tournament.id,
            userId: command.userId,
            status: 'joined' as const,
            joinedAt: now
        };

        await this.unitOfWork.withTransaction(async () => {
            await this.participants.add(participant);
            await this.tournaments.incrementParticipantCount(tournament.id);
            await this.tournaments.setReadyState(tournament.id, shouldSetReady, startTimeoutAt);
        });

        if (this.publisher?.publishPlayerRegistered) {
            await this.publisher.publishPlayerRegistered(tournament.id, participant);
        }

        return {
            success: true,
            message: willAutoStart ? 'Tournament is full and will auto-start' : 'Joined tournament',
            status: tournament.status,
            participantCount: nextCount,
            readyToStart: shouldSetReady,
            startTimeoutSeconds: startTimeoutAt
                ? Math.round((startTimeoutAt.getTime() - now.getTime()) / 1000)
                : 0,
            autoStart: willAutoStart
        };
    }

    private ensureRecruiting(tournament: Tournament) {
        if (tournament.status !== 'recruiting') {
            throw Errors.badRequest('Tournament is not recruiting');
        }
    }

    private async ensurePasscodeIfNeeded(tournament: Tournament, passcode?: string): Promise<void> {
        if (tournament.isPublic) {
            return;
        }

        if (!passcode || !tournament.passcodeHash) {
            throw Errors.forbidden('Passcode required');
        }

        const matches = await bcrypt.compare(passcode, tournament.passcodeHash);
        if (!matches) {
            throw Errors.forbidden('Incorrect passcode');
        }
    }
}
