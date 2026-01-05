import { TournamentParticipantRepository, TournamentRepository } from '../../domain/repositories';
import { StartTournamentUseCase } from '../use-cases/start-tournament.usecase';

interface AutoStartConfig {
    minParticipants: number;
    maxParticipants: number;
}

interface LoggerLike {
    info: (msg: string, meta?: Record<string, unknown>) => void;
    warn: (msg: string, meta?: Record<string, unknown>) => void;
    error: (msg: string, meta?: Record<string, unknown>) => void;
}

export class AutoStartService {
    constructor(
        private readonly tournaments: TournamentRepository,
        private readonly participants: TournamentParticipantRepository,
        private readonly startTournament: StartTournamentUseCase,
        private readonly config: AutoStartConfig,
        private readonly logger?: LoggerLike
    ) {}

    /**
        * Triggered after a participant joins. Starts immediately when the bracket is full.
        */
    async tryAutoStartOnFull(tournamentId: string, participantCount?: number): Promise<boolean> {
        const count = participantCount ?? (await this.participants.countByTournamentId(tournamentId));
        if (count < this.config.maxParticipants) {
            return false;
        }

        await this.startTournament.execute({
            tournamentId,
            reason: 'auto_full'
        });
        this.logger?.info('Tournament auto-started (full)', { tournamentId });
        return true;
    }

    /**
        * Periodic sweep for tournaments whose start timeout expired.
        */
    async processTimeouts(now: Date = new Date()): Promise<void> {
        const ready = await this.tournaments.findReadyForTimeout(now);
        for (const tournament of ready) {
            const count = await this.participants.countByTournamentId(tournament.id);
            if (!this.canStartWithCount(count)) {
                this.logger?.warn('Skipping timeout start (invalid count)', {
                    tournamentId: tournament.id,
                    count
                });
                continue;
            }

            try {
                await this.startTournament.execute({
                    tournamentId: tournament.id,
                    reason: 'timeout'
                });
                this.logger?.info('Tournament auto-started after timeout', {
                    tournamentId: tournament.id,
                    count
                });
            } catch (error) {
                this.logger?.error('Failed to auto-start tournament', {
                    tournamentId: tournament.id,
                    error: error instanceof Error ? error.message : 'unknown'
                });
            }
        }
    }

    private canStartWithCount(count: number): boolean {
        return count === this.config.minParticipants || count === this.config.maxParticipants;
    }
}
