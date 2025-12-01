// ===== Game API Types (aligned with OpenAPI spec) =====

export interface GameSettings {
  arenaWidth?: number;
  arenaHeight?: number;
  scoreLimit?: number;
  paddleSpeed?: number;
  ballSpeed?: number;
}

export interface CreateGameRequest {
  gameMode: 'CLASSIC' | 'TOURNAMENT';
  isPrivate?: boolean;
  opponentId?: string | null;
  settings?: GameSettings;
}

export interface CreateGameResponse {
  id: string;
  mode?: 'CLASSIC' | 'TOURNAMENT';
  player1?: string | null;
  player2?: string | null;
  status: 'WAITING' | 'PLAYING' | 'FINISHED' | 'CANCELLED';
  score: {
    player1: number;
    player2: number;
  };
  settings?: GameSettings;
  createdAt: string;
}

export interface JoinGameResponse {
  gameId: string;
  playerId: string;
  position: 'player1' | 'player2';
}

// ===== Game Lobby Types =====
export interface PlayerInfo {
  id: string;
  username: string;
  avatar?: string;
  ready?: boolean;
}

export interface GameStateOutput {
  id: string;
  players?: PlayerInfo[];
  status: 'WAITING' | 'IN_PROGRESS' | 'PLAYING' | 'FINISHED' | 'CANCELLED';
  score: {
    player1: number;
    player2: number;
  };
  createdAt: string | Date;
  finishedAt?: string | Date;
}

// ===== Gameplay Canvas Types =====
export interface Ball {
  x: number;
  y: number;
  radius: number;
  velocityX: number;
  velocityY: number;
  speed: number;
  maxSpeed: number;
}

export interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
  score: number;
  dy: number;
}

export interface Net {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

export interface GameState {
  ball: Ball;
  player1: Paddle;
  player2: Paddle;
  net: Net;
  isRunning: boolean;
}
// ===== WebSocket Event Payload Types (aligned with websocket-events.yaml) =====

// Client to Server Events
export interface JoinGameEvent {
  gameId: string;
}

export interface ReadyEvent {
  gameId: string;
}

export interface PaddleMoveEvent {
  gameId: string;
  direction?: 'up' | 'down';
  deltaTime?: number;
  y?: number;
  paddleY?: number; // Alternative field name for absolute position
}

export interface SendMessageEvent {
  content: string;
  gameId?: string;
  recipientId?: string;
}

export interface TypingEvent {
  recipientId: string;
}

// Server to Client Events
export interface GameStateUpdateEvent {
  gameId: string;
  ball: {
    x: number;
    y: number;
    velocityX: number;
    velocityY: number;
  };
  paddles: {
    left: { y: number };
    right: { y: number };
  };
  score: {
    left: number;
    right: number;
  };
  // Alternative flatter structure for compatibility
  player1?: { y: number; score: number };
  player2?: { y: number; score: number };
}

export interface GameStartEvent {
  gameId: string;
  timestamp?: string;
}

export interface GameEndEvent {
  gameId: string;
  winnerId: string;
  finalScore: {
    left: number;
    right: number;
  };
}

export interface PlayerJoinedEvent {
  gameId: string;
  playerId: string;
  username?: string;
  players?: PlayerInfo[];
}

export interface PlayerReadyEvent {
  gameId: string;
  playerId: string;
}

export interface PlayerLeftEvent {
  gameId: string;
  playerId: string;
  reason?: string;
}

export interface GameErrorEvent {
  gameId?: string;
  message: string;
  code?: string;
}

export interface MessageReceivedEvent {
  messageId: string;
  senderId: string;
  content: string;
  timestamp: string;
  gameId?: string;
}

export interface TypingIndicatorEvent {
  userId: string;
  isTyping: boolean;
}
