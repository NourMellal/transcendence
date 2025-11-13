/**
 * Friends System Components
 * Phase 2: Friends System - Frontend Implementation
 * 
 * Complete reactive Friends System built on Signal architecture from Phase 1
 */

// Core Friends Manager - Reactive state management
export { FriendsManager, friendsManager } from './FriendsManager';

// Individual Components
export { FriendsListComponent } from './FriendsListComponent';
export { FriendRequestsComponent } from './FriendRequestsComponent';
export { UserSearchComponent } from './UserSearchComponent';

// Main orchestrating component
export { FriendsComponent } from './FriendsComponent';

// Re-export types for convenience
export type { User, Friendship, FriendsState, FriendsActions } from '../../models/Friends';