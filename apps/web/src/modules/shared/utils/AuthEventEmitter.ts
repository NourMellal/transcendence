// apps/web/src/modules/shared/utils/AuthEventEmitter.ts
// Event emitter for authentication-related UI events (2FA prompts, OAuth flows, etc.)

export type AuthEventType =
  | '2fa-required'
  | '2fa-completed'
  | '2fa-cancelled'
  | 'logout'
  | 'token-refreshed'
  | 'token-refresh-failed';

export interface TwoFARequiredEvent {
  type: '2fa-required';
  originalRequest: {
    url: string;
    config: RequestInit;
  };
  resolve: (totpCode: string) => void;
  reject: (reason?: string) => void;
}

export interface TwoFACompletedEvent {
  type: '2fa-completed';
  success: boolean;
}

export interface LogoutEvent {
  type: 'logout';
  reason?: 'token-expired' | 'refresh-failed' | 'user-initiated';
}

export interface TokenRefreshedEvent {
  type: 'token-refreshed';
  newToken: string;
}

export interface TokenRefreshFailedEvent {
  type: 'token-refresh-failed';
  error: Error;
}

export type AuthEvent =
  | TwoFARequiredEvent
  | TwoFACompletedEvent
  | LogoutEvent
  | TokenRefreshedEvent
  | TokenRefreshFailedEvent;

type AuthEventListener<T extends AuthEvent = AuthEvent> = (event: T) => void;

/**
 * Simple event emitter for authentication events
 * Allows UI components to react to auth state changes without tight coupling
 */
export class AuthEventEmitter {
  private listeners: Map<AuthEventType, Set<AuthEventListener>> = new Map();

  /**
   * Subscribe to authentication events
   */
  on<T extends AuthEvent>(eventType: T['type'], listener: AuthEventListener<T>): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }

    this.listeners.get(eventType)!.add(listener as AuthEventListener);

    // Return unsubscribe function
    return () => {
      this.off(eventType, listener);
    };
  }

  /**
   * Unsubscribe from authentication events
   */
  off<T extends AuthEvent>(eventType: T['type'], listener: AuthEventListener<T>): void {
    const eventListeners = this.listeners.get(eventType);
    if (eventListeners) {
      eventListeners.delete(listener as AuthEventListener);
    }
  }

  /**
   * Emit an authentication event
   */
  emit<T extends AuthEvent>(event: T): void {
    const eventListeners = this.listeners.get(event.type);
    if (eventListeners) {
      eventListeners.forEach((listener) => listener(event));
    }
  }

  /**
   * Clear all listeners (useful for testing)
   */
  clear(): void {
    this.listeners.clear();
  }

  /**
   * Wait for 2FA code from user
   * Returns a promise that resolves with the TOTP code or rejects if cancelled
   */
  async request2FA(originalRequest: { url: string; config: RequestInit }): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const event: TwoFARequiredEvent = {
        type: '2fa-required',
        originalRequest,
        resolve: (totpCode: string) => {
          this.emit({ type: '2fa-completed', success: true } as TwoFACompletedEvent);
          resolve(totpCode);
        },
        reject: (reason?: string) => {
          this.emit({ type: '2fa-completed', success: false } as TwoFACompletedEvent);
          reject(new Error(reason || '2FA cancelled'));
        },
      };

      this.emit(event);
    });
  }
}

// Singleton instance
export const authEvents = new AuthEventEmitter();
