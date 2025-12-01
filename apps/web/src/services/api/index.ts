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

// Export types
export type { ApiResponse, RequestConfig } from '../../modules/shared/services/HttpClient';

// Note: AuthService is in ../auth/AuthService.ts and integrates with existing MSW setup
