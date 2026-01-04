export interface CreateGameOptions {
  mode?: string;
  config?: Record<string, unknown>;
  timeoutMs?: number;
  retries?: number;
}

export interface IGameServiceClient {
  ensureUserInGame(gameId: string, userId: string): Promise<[string, string]>;
  createGameFromInvite(
    creatorId: string,
    opponentId: string,
    options?: CreateGameOptions
  ): Promise<{ id: string }>;
  verifyGameExists(gameId: string): Promise<boolean>;
}
