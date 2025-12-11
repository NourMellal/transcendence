/**
 * API Services - Export all service classes
 * These services handle communication with the REST API
 * and abstract away HTTP details from the UI components
 * 
 * Addresses Issue #33: Frontend ↔ Backend Communication Alignment
 */

// Export service classes and instances
export { HttpClient, ApiError } from '../../modules/shared/services/HttpClient';
export { httpClient } from './client';
export { UserService, userService } from './UserService';
export { TournamentService, tournamentService } from './TournamentService';
export { ChatService, chatService } from './ChatService';
export { ChatWebSocketService, chatWebSocketService } from './ChatWebSocketService';

// Export types
export type { ApiResponse, RequestConfig } from '../../modules/shared/services/HttpClient';

// AuthService remains in ../auth/AuthService.ts because it hooks into the MSW-specific wiring.
