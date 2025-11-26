// --- Added for GameLobby and GameService ---
export interface Player {
  id: string;
  username: string;
  avatarUrl?: string;
  ready?: boolean;
}

export interface Game {
  id: string;
  players: Player[];
  status: 'WAITING' | 'IN_PROGRESS' | 'FINISHED';
  settings?: {
    scoreLimit?: number;
    ballSpeed?: string;
  };
}
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