export type WSConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error'
  | 'failed';

export interface WSMessage<T = unknown> {
  type: string;
  payload: T;
}

export type WSEventHandler<T = unknown> = (payload: T) => void;

export interface GameStateUpdatePayload {
  gameId?: string;
  ball: {
    x: number;
    y: number;
    vx: number;
    vy: number;
  };
  paddles: {
    left: { y: number };
    right: { y: number };
  };
  score: { player1: number; player2: number };
  status?: string;
}

export interface PaddleMovePayload {
  direction: 'up' | 'down' | 'stop';
}

export interface GameJoinedPayload {
  gameId: string;
  playerId: string;
  side: 'left' | 'right';
  opponent?: {
    id: string;
    username: string;
  };
}

export interface ChatMessagePayload {
  messageId: string;
  gameId: string;
  senderId: string;
  senderUsername: string;
  content: string;
  sentAt: number;
}

export interface PresenceUpdatePayload {
  userId: string;
  username: string;
  status: 'online' | 'offline' | 'ingame';
  gameId?: string;
  updatedAt: number;
}

export interface JoinGameRequestPayload extends Record<string, unknown> {
  gameId: string;
}

export interface LeaveGamePayload {
  gameId: string;
}

export interface PaddleMoveClientPayload {
  gameId: string;
  direction: 'up' | 'down' | 'stop';
  timestamp: number;
}

export interface ChatMessageSendPayload {
  gameId: string;
  content: string;
  sentAt: number;
}

export interface PresenceHeartbeatPayload {
  status: PresenceUpdatePayload['status'];
  gameId: string | null;
  timestamp: number;
}

export interface ClientPingPayload {
  timestamp: number;
}

export interface ServerPongPayload {
  timestamp: number;
}

export interface GameSocketIncomingEvents {
  game_joined: GameJoinedPayload;
  game_state_update: GameStateUpdatePayload;
  game_chat_message: ChatMessagePayload;
  presence_update: PresenceUpdatePayload;
  server_pong: ServerPongPayload;
  error: unknown;
}

export interface GameSocketOutgoingEvents {
  join_game: JoinGameRequestPayload;
  leave_game: LeaveGamePayload;
  paddle_move: PaddleMoveClientPayload;
  chat_message_send: ChatMessageSendPayload;
  presence_heartbeat: PresenceHeartbeatPayload;
  client_ping: ClientPingPayload;
}
