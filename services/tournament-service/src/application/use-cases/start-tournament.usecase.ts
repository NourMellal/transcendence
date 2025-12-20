import crypto from 'crypto';
import { StartTournamentCommand } from '../dto/start-tournament.dto';
import {
    TournamentBracketStateRepository,
    TournamentMatchRepository,
    TournamentParticipantRepository,
    TournamentRepository,
    UnitOfWork
} from '../../domain/repositories';
import { Errors } from '../errors';
import { Tournament, TournamentMatch, TournamentParticipant } from '../../domain/entities';
import { BracketGenerator, BracketGeneratorConfig } from '../services/bracket-generator';

export type StartTournamentConfig = BracketGeneratorConfig;

export interface StartTournamentResult {
    tournament: Tournament;
    participants: TournamentParticipant[];
    matches: TournamentMatch[];
}

export class StartTournamentUseCase {
    private readonly bracket: BracketGenerator;

    constructor(
        private readonly tournaments: TournamentRepository,
        private readonly participantsRepo: TournamentParticipantRepository,
        private readonly matches: TournamentMatchRepository,
        private readonly bracketStates: TournamentBracketStateRepository,
        private readonly unitOfWork: UnitOfWork,
        private readonly config: StartTournamentConfig
    ) {
        this.bracket = new BracketGenerator(config);
    }

    async execute(command: StartTournamentCommand): Promise<StartTournamentResult> {
        const tournament = await this.tournaments.findById(command.tournamentId);
        if (!tournament) {
            throw Errors.notFound('Tournament not found');
        }

        if (tournament.status !== 'recruiting') {
            throw Errors.conflict('Tournament already started');
        }

        const participants = await this.participantsRepo.listByTournamentId(tournament.id);
        const count = participants.length;

        this.ensureCanStart(command, tournament, count);

        const now = new Date();
        const { matches, snapshot } = this.bracket.generate(tournament.id, participants);
        const bracketVersion = await this.getNextBracketVersion(tournament.id);

        const updatedTournament: Tournament = {
            ...tournament,
            status: 'in_progress',
            readyToStart: false,
            startTimeoutAt: null,
            startedAt: now,
            updatedAt: now,
            currentParticipants: count
        };

        await this.unitOfWork.withTransaction(async () => {
            await this.matches.createMany(matches);
            await this.bracketStates.save({
                id: crypto.randomUUID(),
                tournamentId: tournament.id,
                bracketJson: JSON.stringify(snapshot),
                version: bracketVersion,
                createdAt: now
            });
            await this.tournaments.update(updatedTournament);
        });

        return {
            tournament: updatedTournament,
            participants,
            matches
        };
    }

    private ensureCanStart(
        command: StartTournamentCommand,
        tournament: Tournament,
        participantCount: number
    ): void {
        if (participantCount < this.config.minParticipants) {
            throw Errors.badRequest('Not enough participants to start');
        }

        if (participantCount > this.config.maxParticipants) {
            throw Errors.conflict('Tournament exceeds max participants');
        }

        const allowedCounts = [this.config.minParticipants, this.config.maxParticipants];
        if (!allowedCounts.includes(participantCount)) {
            throw Errors.conflict(
                `Tournament can only start at ${this.config.minParticipants} or ${this.config.maxParticipants} players`
            );
        }

        if (command.reason === 'manual' && command.requestedBy && command.requestedBy !== tournament.creatorId) {
            throw Errors.forbidden('Only the creator can start the tournament');
        }
    }

    private async getNextBracketVersion(tournamentId: string): Promise<number> {
        const latest = await this.bracketStates.getLatest(tournamentId);
        return latest ? latest.version + 1 : 1;
    }
}
