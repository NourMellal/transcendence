interface GameSummary {
  id: string;
  player1: string | null;
  player2: string | null;
  players?: { id: string }[];
}

export class GameServiceClient {
  constructor(
    private readonly baseUrl: string,
    private readonly internalApiKey?: string
  ) {}

  async ensureUserInGame(gameId: string, userId: string): Promise<[string, string]> {
    const response = await fetch(`${this.baseUrl}/games/${gameId}`, {
      headers: this.buildHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Game service unavailable (status ${response.status})`);
    }

    const game = (await response.json()) as GameSummary;
    const playerIds = this.extractPlayers(game);

    if (!playerIds.includes(userId)) {
      throw new Error('You must be in this game to chat');
    }

    if (playerIds.length < 2) {
      throw new Error('Game lobby is incomplete');
    }

    return [playerIds[0], playerIds[1]];
  }

  private extractPlayers(game: GameSummary): string[] {
    if (Array.isArray(game.players) && game.players.length > 0) {
      return game.players.map((p) => p.id).filter(Boolean);
    }
    const ids: string[] = [];
    if (game.player1) ids.push(game.player1);
    if (game.player2) ids.push(game.player2);
    return ids;
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    if (this.internalApiKey) {
      headers['x-internal-api-key'] = this.internalApiKey;
    }
    return headers;
  }
}
