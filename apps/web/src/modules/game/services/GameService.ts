import { httpClient } from '@/modules/shared/services/HttpClient';
import type { Game } from '../types/game.types';

class GameService {
  async getGame(gameId: string): Promise<Game> {
    return httpClient.get<Game>(`/games/${gameId}`);
  }

  async setReady(gameId: string): Promise<void> {
    return httpClient.post(`/games/${gameId}/ready`, {});
  }

  async leaveGame(gameId: string): Promise<void> {
    return httpClient.post(`/games/${gameId}/leave`, {});
  }
}

export const gameService = new GameService();
