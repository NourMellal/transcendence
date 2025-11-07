import { httpClient, ApiResponse } from './HttpClient';
import { UserDTOs, User } from '../../models';

/**
 * Authentication Service
 * Handles user authentication, registration, and session management
 */
export class AuthService {
  private static instance: AuthService;

  /**
   * Get singleton instance
   */
  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }
  /**
   * Register a new user
   */
  async register(request: UserDTOs.RegisterRequest): Promise<UserDTOs.RegisterResponse> {
    const response = await httpClient.post<UserDTOs.RegisterResponse>('/auth/register', request);
    
    if (response.data?.token) {
      httpClient.setAuthToken(response.data.token);
    }
    
    return response.data!;
  }

  /**
   * Login user with email and password
   */
  async login(request: UserDTOs.LoginRequest): Promise<UserDTOs.LoginResponse> {
    const response = await httpClient.post<UserDTOs.LoginResponse>('/auth/login', request);
    
    if (response.data?.token) {
      httpClient.setAuthToken(response.data.token);
    }
    
    return response.data!;
  }

  /**
   * Start 42 School OAuth login
   */
  async start42Login(): Promise<{ authorizationUrl: string; state: string }> {
    const response = await httpClient.get<{ authorizationUrl: string; state: string }>('/auth/42/login');
    return response.data!;
  }

  /**
   * Handle 42 School OAuth callback
   */
  async handle42Callback(code: string, state: string): Promise<UserDTOs.LoginResponse> {
    const response = await httpClient.get<UserDTOs.LoginResponse>(
      `/auth/42/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`
    );
    
    if (response.data?.token) {
      httpClient.setAuthToken(response.data.token);
    }
    
    return response.data!;
  }

  /**
   * Get current authentication status
   */
  async getStatus(): Promise<User | null> {
    try {
      const response = await httpClient.get<User>('/auth/status');
      return response.data!;
    } catch (error) {
      // If 401, user is not authenticated
      return null;
    }
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    try {
      await httpClient.post('/auth/logout');
    } finally {
      // Clear token regardless of API response
      httpClient.clearAuthToken();
    }
  }

  /**
   * Generate 2FA secret and QR code
   */
  async generate2FA(): Promise<UserDTOs.Generate2FAResponse> {
    const response = await httpClient.post<UserDTOs.Generate2FAResponse>('/auth/2fa/generate');
    return response.data!;
  }

  /**
   * Enable 2FA with secret and verification code
   */
  async enable2FA(request: UserDTOs.Enable2FARequest): Promise<void> {
    await httpClient.post('/auth/2fa/enable', request);
  }

  /**
   * Check if user is currently logged in (has valid token)
   */
  isAuthenticated(): boolean {
    return httpClient.getAuthToken() !== null;
  }

  /**
   * Get current auth token
   */
  getAuthToken(): string | null {
    return httpClient.getAuthToken();
  }

  /**
   * Set auth token manually (useful for testing or external token sources)
   */
  setAuthToken(token: string): void {
    httpClient.setAuthToken(token);
  }
}

// Export singleton instance
export const authService = new AuthService();