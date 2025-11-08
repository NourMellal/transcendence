/**
 * Frontend Models - Export all model interfaces and types
 * These are separate from backend domain entities and represent
 * the data structures used by the frontend when consuming the REST API
 */

// Main model interfaces
export * from './User';
export * from './Game';
export * from './Tournament';
export * from './Common';

// Type aliases for convenience
export type { User, UserProfile, UserStats, Friend } from './User';
export type { Game, GamePlayer, GameSettings, Match, GameState } from './Game';
export type { Tournament, TournamentParticipant, TournamentMatch } from './Tournament';
export type { 
  ApiErrorResponse, 
  PaginatedResponse, 
  WebSocketMessage, 
  ChatMessage, 
  Notification 
} from './Common';