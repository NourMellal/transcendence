/**
 * API Services - Export all service classes
 * These services handle communication with the REST API
 * and abstract away HTTP details from the UI components
 */

// Export service classes and instances
export { HttpClient, httpClient, ApiError } from './HttpClient';
export { AuthService, authService } from './AuthService';
export { UserService, userService } from './UserService';
export { GameService, gameService } from './GameService';
export { TournamentService, tournamentService } from './TournamentService';
export { ChatService, chatService } from './ChatService';

// Export types
export type { ApiResponse, RequestConfig } from './HttpClient';