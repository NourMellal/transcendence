/**
 * Utility functions - Export all utility modules
 */

// Export all utility functions
export * from './errors';
export * from './auth';
export * from './validation';
export * from './helpers';

// Re-export commonly used utilities with better names
export {
  getErrorMessage,
  errorToNotification,
  withRetry,
  ERROR_MESSAGES
} from './errors';

export {
  authManager,
  useAuth
} from './auth';

export {
  validateEmail,
  validatePassword,
  validateUsername,
  validateForm
} from './validation';

export {
  formatDate,
  formatDateTime,
  getRelativeTime,
  debounce,
  throttle
} from './helpers';