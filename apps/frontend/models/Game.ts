export type GameStatus = 'waiting' | 'in_progress' | 'finished';

export interface GamePlayer {
  id: string;
  username: string;
  score: number;
  avatarUrl?: string;
}

export interface Game {
  id: string;
  status: GameStatus;
  players: GamePlayer[];
  createdAt: string;
  updatedAt: string;
  winnerId?: string;
  mode?: 'ranked' | 'casual';
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface CreateGameRequest {
  mode?: 'ranked' | 'casual';
  maxPlayers?: number;
}

export interface CreateGameResponse {
  game: Game;
}

export interface JoinGameResponse {
  game: Game;
  message?: string;
}

export interface LeaveGameResponse {
  message: string;
}

export interface ScoreUpdateRequest {
  playerId: string;
  delta: number;
}
