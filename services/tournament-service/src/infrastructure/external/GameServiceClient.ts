import {
    CreateTournamentGameRequest,
    CreateTournamentGameResponse,
    GameServiceError,
    IGameServiceClient
} from '../../application/ports/external/IGameServiceClient';

const TOURNAMENT_GAME_CONFIG = {
    scoreLimit: 11,
    ballSpeed: 5,
    paddleSpeed: 8
};

export class GameServiceClient implements IGameServiceClient {
    constructor(
        private readonly baseUrl: string,
        private readonly internalApiKey?: string
    ) {}

    async createTournamentGame(request: CreateTournamentGameRequest): Promise<CreateTournamentGameResponse> {
        if (!this.internalApiKey) {
            throw new GameServiceError('Internal API key not configured', 503);
        }

        const response = await fetch(`${this.baseUrl}/games`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-internal-api-key': this.internalApiKey,
                'x-user-id': request.playerId
            },
            body: JSON.stringify({
                gameMode: 'TOURNAMENT',
                opponentId: request.opponentId,
                tournamentId: request.tournamentId,
                matchId: request.matchId,
                config: TOURNAMENT_GAME_CONFIG
            })
        });

        const payload = await safeJson(response);
        if (!response.ok) {
            const message =
                (payload && typeof payload.error === 'string' && payload.error) ||
                (payload && typeof payload.message === 'string' && payload.message) ||
                `Game service responded with ${response.status}`;
            throw new GameServiceError(message, response.status);
        }

        if (!payload || typeof payload.id !== 'string') {
            throw new GameServiceError('Invalid response from game service', 502);
        }

        return { gameId: payload.id };
    }
}

async function safeJson(response: Response): Promise<Record<string, unknown> | null> {
    try {
        return (await response.json()) as Record<string, unknown>;
    } catch {
        return null;
    }
}
