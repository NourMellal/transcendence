/**
 * Common types and enums used across the frontend
 */

export type UserStatus = 'ONLINE' | 'OFFLINE' | 'INGAME';

export type GameType = 'pong' | 'tournament' | 'custom';

export type GameStatus = 'waiting' | 'playing' | 'finished' | 'cancelled';

export type TournamentType = 'single_elimination' | 'double_elimination' | 'round_robin';

export type TournamentStatus = 'registration' | 'in_progress' | 'finished' | 'cancelled';

export type ParticipantStatus = 'registered' | 'active' | 'eliminated' | 'winner';

export type MatchStatus = 'pending' | 'ready' | 'in_progress' | 'completed';

export type PowerUpType = 'speed_boost' | 'big_paddle' | 'multi_ball' | 'freeze';

export type Direction = 'up' | 'down' | 'left' | 'right';

export type PlayerPosition = 'left' | 'right' | 'top' | 'bottom';

/**
 * API Error response structure
 */
export interface ApiErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  timestamp?: string;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

/**
 * WebSocket message types
 */
export type WebSocketMessageType = 
  | 'game_state_update'
  | 'player_joined'
  | 'player_left'
  | 'game_started'
  | 'game_finished'
  | 'tournament_update'
  | 'chat_message'
  | 'friend_status_update';

export interface WebSocketMessage<T = any> {
  type: WebSocketMessageType;
  payload: T;
  timestamp: string;
}

/**
 * Chat message
 */
export interface ChatMessage {
  id: string;
  senderId: string;
  senderUsername: string;
  recipientId?: string; // null for public/room messages
  roomId?: string;
  content: string;
  type: 'text' | 'game_invite' | 'system';
  sentAt: string; // ISO date string
}

/**
 * Notification types
 */
export interface Notification {
  id: string;
  userId: string;
  type: 'friend_request' | 'game_invite' | 'tournament_start' | 'match_ready' | 'system';
  title: string;
  message: string;
  data?: any; // Additional data for the notification
  isRead: boolean;
  createdAt: string; // ISO date string
}