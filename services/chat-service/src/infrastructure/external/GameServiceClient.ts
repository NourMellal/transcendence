interface GameSummary {
  id: string;
  player1: string | null;
  player2: string | null;
  players?: { id: string }[];
}

interface CreateGameOptions {
  mode?: string;
  config?: Record<string, unknown>;
  timeoutMs?: number;
  retries?: number;
}

/**
 * Client for communicating with the Game Service
 * Handles game creation with timeout, retry logic, and proper error handling
 */
export class GameServiceClient {
  private readonly DEFAULT_TIMEOUT_MS = 10000; // 10 seconds
  private readonly DEFAULT_RETRIES = 2;

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
  
  /**
   * Create a game from an invite with retry logic and timeout handling
   * @throws {Error} If game creation fails after all retries
   */
  async createGameFromInvite(
    creatorId: string,
    opponentId: string,
    options: CreateGameOptions = {}
  ): Promise<{ id: string }> {
    const timeoutMs = options.timeoutMs || this.DEFAULT_TIMEOUT_MS;
    const maxRetries = options.retries !== undefined ? options.retries : this.DEFAULT_RETRIES;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          // Exponential backoff: 1s, 2s, 4s
          const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await this.sleep(backoffMs);
        }

        return await this.createGameWithTimeout(creatorId, opponentId, options, timeoutMs);
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry if it's a validation error (4xx)
        if (lastError.message.includes('status 4')) {
          throw lastError;
        }

        // Log retry attempt
        if (attempt < maxRetries) {
          console.warn(`[GameServiceClient] Game creation attempt ${attempt + 1} failed, retrying...`, {
            creatorId,
            opponentId,
            error: lastError.message,
          });
        }
      }
    }

    // All retries exhausted
    throw new Error(
      `Game creation failed after ${maxRetries + 1} attempts: ${lastError?.message || 'Unknown error'}`
    );
  }

  /**
   * Create game with timeout wrapper
   */
  private async createGameWithTimeout(
    creatorId: string,
    opponentId: string,
    options: CreateGameOptions,
    timeoutMs: number
  ): Promise<{ id: string }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const body: Record<string, unknown> = {
        gameMode: options.mode ?? 'CLASSIC',
        opponentId,
        isPrivate: true,
        config: options.config ?? {}
      };

      const response = await fetch(`${this.baseUrl}/games`, {
        method: 'POST',
        headers: {
          ...this.buildHeaders(creatorId),
          'content-type': 'application/json'
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        let errorMessage = `Game service error (status ${response.status})`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (_) {
          // Failed to parse error response
        }
        throw new Error(errorMessage);
      }

      const result = (await response.json()) as { id: string };
      
      // Verify game was actually created
      if (!result.id) {
        throw new Error('Game service returned invalid response: missing game ID');
      }

      return result;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Game creation timed out after ${timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Verify game exists and is properly persisted
   */
  async verifyGameExists(gameId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/games/${gameId}`, {
        headers: this.buildHeaders(),
      });
      return response.ok;
    } catch (error) {
      console.error('[GameServiceClient] Failed to verify game existence:', error);
      return false;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private buildHeaders(userId?: string): Record<string, string> {
    const headers: Record<string, string> = {};
    if (userId) {
      headers['x-user-id'] = userId;
    }
    if (this.internalApiKey) {
      headers['x-internal-api-key'] = this.internalApiKey;
    }
    return headers;
  }
}
