import { ApiError } from '../modules/shared/services/HttpClient';

/**
 * Error handling utilities for the frontend
 */

/**
 * Extract user-friendly error message from various error types
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'An unexpected error occurred';
}

/**
 * Check if error is a network/connectivity error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status === 0; // Network error
  }
  
  if (error instanceof Error) {
    return error.message.toLowerCase().includes('network') ||
           error.message.toLowerCase().includes('fetch');
  }
  
  return false;
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status === 401 || error.status === 403;
  }
  
  return false;
}

/**
 * Check if error is a validation error
 */
export function isValidationError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status === 400 || error.status === 422;
  }
  
  return false;
}

/**
 * Check if error is a server error
 */
export function isServerError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status >= 500;
  }
  
  return false;
}

/**
 * Get validation errors from API response
 */
export function getValidationErrors(error: unknown): Record<string, string[]> {
  if (error instanceof ApiError && error.response?.errors) {
    return error.response.errors;
  }
  
  return {};
}

/**
 * Format error for logging
 */
export function formatErrorForLogging(error: unknown, context?: string): {
  message: string;
  stack?: string;
  status?: number;
  context?: string;
  timestamp: string;
} {
  const timestamp = new Date().toISOString();
  
  if (error instanceof ApiError) {
    return {
      message: error.message,
      status: error.status,
      context,
      timestamp
    };
  }
  
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      context,
      timestamp
    };
  }
  
  return {
    message: String(error),
    context,
    timestamp
  };
}

/**
 * Error notification types for UI feedback
 */
export type ErrorSeverity = 'error' | 'warning' | 'info';

export interface ErrorNotification {
  id: string;
  message: string;
  severity: ErrorSeverity;
  timestamp: string;
  dismissible: boolean;
  action?: {
    label: string;
    handler: () => void;
  };
}

/**
 * Convert error to UI notification
 */
export function errorToNotification(
  error: unknown, 
  options: {
    dismissible?: boolean;
    action?: ErrorNotification['action'];
  } = {}
): ErrorNotification {
  const message = getErrorMessage(error);
  let severity: ErrorSeverity = 'error';
  
  if (isNetworkError(error)) {
    severity = 'warning';
  } else if (isValidationError(error)) {
    severity = 'info';
  }
  
  return {
    id: crypto.randomUUID(),
    message,
    severity,
    timestamp: new Date().toISOString(),
    dismissible: options.dismissible ?? true,
    action: options.action
  };
}

/**
 * Retry utility for failed requests
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    delay?: number;
    backoff?: boolean;
    shouldRetry?: (error: unknown) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delay = 1000,
    backoff = true,
    shouldRetry = (error) => isNetworkError(error) || isServerError(error)
  } = options;
  
  let lastError: unknown;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }
      
      const waitTime = backoff ? delay * Math.pow(2, attempt) : delay;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw lastError;
}

/**
 * Common error messages
 */
export const ERROR_MESSAGES = {
  NETWORK: 'Network connection error. Please check your internet connection.',
  AUTH_REQUIRED: 'Authentication required. Please log in.',
  ACCESS_DENIED: 'Access denied. You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  SERVER_ERROR: 'Server error occurred. Please try again later.',
  VALIDATION: 'Invalid input. Please check your data and try again.',
  TIMEOUT: 'Request timed out. Please try again.',
  UNKNOWN: 'An unexpected error occurred. Please try again.'
} as const;

/**
 * Simple notification system for development
 */
export function showError(message: string): void {
  console.error('ERROR:', message);
  
  // Create simple toast notification
  const toast = document.createElement('div');
  toast.className = 'error-toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #dc3545;
    color: white;
    padding: 12px 16px;
    border-radius: 6px;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    max-width: 300px;
    word-wrap: break-word;
  `;
  
  document.body.appendChild(toast);
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 5000);
}

/**
 * Simple success notification for development
 */
export function showSuccess(message: string): void {
  console.log('SUCCESS:', message);
  
  // Create simple toast notification
  const toast = document.createElement('div');
  toast.className = 'success-toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #28a745;
    color: white;
    padding: 12px 16px;
    border-radius: 6px;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    max-width: 300px;
    word-wrap: break-word;
  `;
  
  document.body.appendChild(toast);
  
  // Auto remove after 3 seconds
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 3000);
}