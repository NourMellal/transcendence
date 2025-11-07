/**
 * Authentication state management utilities
 */

import { User } from '../models';
import { authService } from '../services/auth/AuthService';

/**
 * Authentication state
 */
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Auth state manager using localStorage and memory
 */
class AuthManager {
  private state: AuthState = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null
  };
  
  private listeners: Array<(state: AuthState) => void> = [];

  /**
   * Get current auth state
   */
  getState(): AuthState {
    return { ...this.state };
  }

  /**
   * Subscribe to auth state changes
   */
  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Update auth state and notify listeners
   */
  private setState(updates: Partial<AuthState>): void {
    this.state = { ...this.state, ...updates };
    this.listeners.forEach(listener => listener(this.getState()));
  }

  /**
   * Initialize auth state on app startup
   */
  async initialize(): Promise<void> {
    this.setState({ isLoading: true, error: null });
    
    try {
      const user = await authService.getStatus();
      if (user) {
        this.setState({
          user,
          isAuthenticated: true,
          isLoading: false
        });
      } else {
        this.setState({
          user: null,
          isAuthenticated: false,
          isLoading: false
        });
      }
    } catch (error) {
      this.setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Authentication check failed'
      });
    }
  }

  /**
   * Login with credentials
   */
  async login(email: string, password: string, twoFACode?: string): Promise<void> {
    this.setState({ isLoading: true, error: null });
    
    try {
      const response = await authService.login({ email, password, twoFACode });
      this.setState({
        user: response.user,
        isAuthenticated: true,
        isLoading: false
      });
    } catch (error) {
      this.setState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Login failed'
      });
      throw error;
    }
  }

  /**
   * Register new user
   */
  async register(username: string, email: string, password: string): Promise<void> {
    this.setState({ isLoading: true, error: null });
    
    try {
      const response = await authService.register({ username, email, password });
      this.setState({
        user: response.user,
        isAuthenticated: true,
        isLoading: false
      });
    } catch (error) {
      this.setState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Registration failed'
      });
      throw error;
    }
  }

  /**
   * Start 42 OAuth login
   */
  async start42Login(): Promise<void> {
    try {
      const { authorizationUrl } = await authService.start42Login();
      window.location.href = authorizationUrl;
    } catch (error) {
      this.setState({
        error: error instanceof Error ? error.message : '42 login failed'
      });
      throw error;
    }
  }

  /**
   * Handle 42 OAuth callback
   */
  async handle42Callback(code: string, state: string): Promise<void> {
    this.setState({ isLoading: true, error: null });
    
    try {
      const response = await authService.handle42Callback(code, state);
      this.setState({
        user: response.user,
        isAuthenticated: true,
        isLoading: false
      });
    } catch (error) {
      this.setState({
        isLoading: false,
        error: error instanceof Error ? error.message : '42 callback failed'
      });
      throw error;
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      await authService.logout();
    } catch (error) {
      // Continue with logout even if API call fails
      console.warn('Logout API call failed:', error);
    }
    
    this.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null
    });
  }

  /**
   * Update user profile
   */
  updateUser(user: User): void {
    this.setState({ user });
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.setState({ error: null });
  }
}

// Export singleton instance
export const authManager = new AuthManager();

/**
 * Hook-like function to get auth state (for non-React usage)
 */
export function useAuth(): AuthState & {
  login: (email: string, password: string, twoFACode?: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  start42Login: () => Promise<void>;
  clearError: () => void;
} {
  return {
    ...authManager.getState(),
    login: authManager.login.bind(authManager),
    register: authManager.register.bind(authManager),
    logout: authManager.logout.bind(authManager),
    start42Login: authManager.start42Login.bind(authManager),
    clearError: authManager.clearError.bind(authManager)
  };
}
