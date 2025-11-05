/**
 * MSW Mocks entry point
 * Export all mock-related utilities
 */

export { handlers } from './handlers';
export { worker } from './browser';
export { mockUser, currentUser, updateCurrentUser, resetCurrentUser } from './data';
export type { User } from './data';
