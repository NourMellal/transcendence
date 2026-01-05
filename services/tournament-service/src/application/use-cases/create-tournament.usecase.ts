import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { CreateTournamentCommand } from '../dto/create-tournament.dto';
import { TournamentRepository, UnitOfWork } from '../../domain/repositories';
import { Tournament } from '../../domain/entities';
import { TournamentBracketType } from '../../domain/types';
import { Errors } from '../errors';
import { ITournamentEventPublisher } from '../ports/messaging/ITournamentEventPublisher';

export interface CreateTournamentConfig {
    minParticipants: number;
    maxParticipants: number;
    accessCodeLength?: number;
}

export class CreateTournamentUseCase {
    constructor(
        private readonly tournaments: TournamentRepository,
        private readonly unitOfWork: UnitOfWork,
        private readonly config: CreateTournamentConfig,
        private readonly publisher?: ITournamentEventPublisher
    ) {}

    async execute(command: CreateTournamentCommand): Promise<Tournament> {
        this.ensureSingleElimination(command.bracketType);

        if (!command.creatorId) {
            throw Errors.unauthorized('creatorId is required');
        }

        const isPublic = command.isPublic;
        const passcodeHash = isPublic
            ? null
            : await this.hashPasscode(command.privatePasscode);

        const accessCode = isPublic ? this.generateAccessCode(this.config.accessCodeLength ?? 6) : null;
        const now = new Date();

        const tournament: Tournament = {
            id: crypto.randomUUID(),
            name: command.name,
            creatorId: command.creatorId,
            status: 'recruiting',
            bracketType: command.bracketType,
            maxParticipants: this.config.maxParticipants,
            minParticipants: this.config.minParticipants,
            currentParticipants: 0,
            isPublic,
            accessCode,
            passcodeHash,
            readyToStart: false,
            readyAt: null,
            startTimeoutAt: null,
            createdAt: now,
            startedAt: null,
            finishedAt: null,
            updatedAt: now
        };

        await this.unitOfWork.withTransaction(async () => {
            await this.tournaments.create(tournament);
        });

        if (this.publisher?.publishTournamentCreated) {
            await this.publisher.publishTournamentCreated(tournament);
        }

        return tournament;
    }

    private ensureSingleElimination(bracketType: TournamentBracketType) {
        if (bracketType !== 'single_elimination') {
            throw Errors.badRequest('Only single_elimination bracket type is supported for MVP');
        }
    }

    private async hashPasscode(passcode?: string): Promise<string | null> {
        if (!passcode) {
            throw Errors.badRequest('Private tournaments require a passcode');
        }
        return bcrypt.hash(passcode, 10);
    }

    private generateAccessCode(length: number): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < length; i += 1) {
            const idx = Math.floor(Math.random() * chars.length);
            code += chars[idx];
        }
        return code;
    }
}
