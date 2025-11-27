// ===== Game Lobby Types =====
export interface PlayerInfo {
  id: string;
  username: string;
  avatar?: string;
  ready?: boolean;
}

export interface GameStateOutput {
  id: string;
  players: PlayerInfo[];
  status: 'WAITING' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';
  score: {
    player1: number;
    player2: number;
  };
  createdAt: Date;
  finishedAt?: Date;
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