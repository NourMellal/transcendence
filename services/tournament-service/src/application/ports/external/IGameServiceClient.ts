export interface CreateTournamentGameRequest {
    readonly tournamentId: string;
    readonly matchId: string;
    readonly playerId: string;
    readonly opponentId: string;
}

export interface CreateTournamentGameResponse {
    readonly gameId: string;
}

export class GameServiceError extends Error {
    constructor(message: string, public readonly status: number) {
        super(message);
        this.name = 'GameServiceError';
    }
}

export interface IGameServiceClient {
    createTournamentGame(request: CreateTournamentGameRequest): Promise<CreateTournamentGameResponse>;
}
