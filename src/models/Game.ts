/**
 * Frontend Game model - represents game data from API responses
 */
export interface Game {
  id: string;
  type: 'pong' | 'tournament';
  status: 'waiting' | 'playing' | 'finished' | 'cancelled';
  players: GamePlayer[];
  settings: GameSettings;
  createdAt: string; // ISO date string
  startedAt?: string; // ISO date string
  finishedAt?: string; // ISO date string
}

/**
 * Player in a game
 */
export interface GamePlayer {
  id: string;
  username: string;
  avatar?: string;
  score: number;
  position: 'left' | 'right' | 'top' | 'bottom'; // For multiplayer games
  isConnected: boolean;
}

/**
 * Game settings and customization options
 */
export interface GameSettings {
  maxScore: number;
  paddleSpeed: number;
  ballSpeed: number;
  powerUpsEnabled: boolean;
  mapType?: 'classic' | 'space' | 'neon';
  maxPlayers: number;
  isRanked: boolean;
}

/**
 * Match result (completed game)
 */
export interface Match {
  id: string;
  gameType: 'pong' | 'tournament';
  players: MatchPlayer[];
  winner: MatchPlayer;
  duration: number; // in seconds
  playedAt: string; // ISO date string
  tournamentId?: string;
}

/**
 * Player result in a match
 */
export interface MatchPlayer {
  id: string;
  username: string;
  avatar?: string;
  score: number;
  isWinner: boolean;
}

/**
 * Real-time game state (for active games)
 */
export interface GameState {
  gameId: string;
  ball: {
    x: number;
    y: number;
    velocityX: number;
    velocityY: number;
  };
  paddles: Record<string, {
    x: number;
    y: number;
    playerId: string;
  }>;
  scores: Record<string, number>;
  powerUps: PowerUp[];
  gameTime: number; // elapsed time in seconds
  status: 'playing' | 'paused' | 'finished';
}

/**
 * Power-up in game (if customization enabled)
 */
export interface PowerUp {
  id: string;
  type: 'speed_boost' | 'big_paddle' | 'multi_ball' | 'freeze';
  x: number;
  y: number;
  expiresAt: number; // timestamp
}

/**
 * Request/Response DTOs for game-related API calls
 */
export namespace GameDTOs {
  export interface CreateGameRequest {
    gameType: 'pong' | 'custom';
    settings: Partial<GameSettings>;
    invitePlayerIds?: string[];
  }

  export interface CreateGameResponse {
    game: Game;
    joinCode?: string;
  }

  export interface JoinGameRequest {
    gameId?: string;
    joinCode?: string;
  }

  export interface JoinGameResponse {
    game: Game;
    playerId: string;
  }

  export interface MoveInput {
    direction: 'up' | 'down' | 'left' | 'right';
    pressed: boolean; // true for keydown, false for keyup
  }

  export interface GameListResponse {
    games: Game[];
    totalCount: number;
  }
}