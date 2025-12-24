import { AppError, Errors } from '../errors';
import {
    TournamentMatchRepository,
    TournamentRepository,
    UnitOfWork
} from '../../domain/repositories';
import {
    GameServiceError,
    IGameServiceClient
} from '../ports/external/IGameServiceClient';
import { TournamentMatch } from '../../domain/entities';

export interface PlayMatchCommand {
    tournamentId: string;
    matchId: string;
    userId: string;
}

export interface PlayMatchResult {
    gameId: string;
    redirectUrl: string;
}

export class PlayMatchUseCase {
    constructor(
        private readonly tournaments: TournamentRepository,
        private readonly matches: TournamentMatchRepository,
        private readonly unitOfWork: UnitOfWork,
        private readonly gameService: IGameServiceClient
    ) {}

    async execute(command: PlayMatchCommand): Promise<PlayMatchResult> {
        if (!command.userId) {
            throw Errors.unauthorized('Missing user identity');
        }

        const tournament = await this.tournaments.findById(command.tournamentId);
        if (!tournament) {
            throw Errors.notFound('Tournament not found');
        }

        if (tournament.status !== 'in_progress') {
            throw Errors.badRequest('Tournament not in progress');
        }

        const match = await this.matches.findById(command.matchId);
        if (!match || match.tournamentId !== tournament.id) {
            throw Errors.notFound('Match not found');
        }

        const player1Id = match.player1Id ?? null;
        const player2Id = match.player2Id ?? null;
        if (!player1Id || !player2Id) {
            throw Errors.badRequest('Match is not ready');
        }

        if (command.userId !== player1Id && command.userId !== player2Id) {
            throw Errors.forbidden('You are not a participant in this match');
        }

        if (match.status !== 'pending') {
            if (match.status === 'in_progress' && match.gameId) {
                return {
                    gameId: match.gameId,
                    redirectUrl: `/game/play/${match.gameId}`
                };
            }
            if (match.status === 'finished') {
                throw Errors.badRequest('Match already finished');
            }
            throw Errors.badRequest('Match already started');
        }

        if (match.gameId) {
            return {
                gameId: match.gameId,
                redirectUrl: `/game/play/${match.gameId}`
            };
        }

        const opponentId = command.userId === player1Id ? player2Id : player1Id;

        let gameId: string;
        try {
            const created = await this.createGame({
                tournamentId: tournament.id,
                matchId: match.id,
                playerId: command.userId,
                opponentId
            });
            gameId = created.gameId;
        } catch (error) {
            if (error instanceof AppError && error.statusCode === 409) {
                const latest = await this.matches.findById(match.id);
                if (latest?.gameId) {
                    return {
                        gameId: latest.gameId,
                        redirectUrl: `/game/play/${latest.gameId}`
                    };
                }
            }
            throw error;
        }

        const startedAt = new Date();
        const updatedMatch: TournamentMatch = {
            ...match,
            status: 'in_progress',
            gameId,
            startedAt
        };

        await this.unitOfWork.withTransaction(async () => {
            await this.matches.update(updatedMatch);
        });

        return {
            gameId,
            redirectUrl: `/game/play/${gameId}`
        };
    }

    private async createGame(request: {
        tournamentId: string;
        matchId: string;
        playerId: string;
        opponentId: string;
    }): Promise<{ gameId: string }> {
        try {
            return await this.gameService.createTournamentGame(request);
        } catch (error) {
            throw this.mapGameServiceError(error);
        }
    }

    private mapGameServiceError(error: unknown): AppError {
        if (error instanceof GameServiceError) {
            if (error.status === 409) {
                return Errors.conflict(error.message || 'Player already has an active game');
            }

            if (error.status === 400) {
                return Errors.badRequest(error.message || 'Invalid game request');
            }

            if (error.status === 401 || error.status === 403) {
                return Errors.forbidden('Game service rejected the request');
            }

            if (error.status >= 500) {
                return new AppError('Game service unavailable', 503);
            }

            return new AppError('Game service error', 502);
        }

        return new AppError('Game service unavailable', 503);
    }
}
