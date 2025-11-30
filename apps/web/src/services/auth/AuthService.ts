/**
 * Authentication service
 * Handles all authentication-related API calls
 */

import { HttpClient } from '../../modules/shared/services/HttpClient';
import { httpClient as defaultHttpClient } from '../api/client';
import type { User } from '../../models/User';
import type { SignUpRequest, LoginRequest, LoginResponse } from '../../models/Auth';

type OAuthAuthorizationResponse = {
  authorizationUrl: string;
};

export class AuthService {
  constructor(private readonly httpClient: HttpClient = defaultHttpClient) {}

  /**
   * Register a new user
   * POST /auth/signup
   */
  async signup(data: SignUpRequest): Promise<User> {
    const response = await this.httpClient.post<User>('/api/auth/signup', data);
    return response.data!;
  }

  /**
   * Convenience method for authManager
   */
  async register(data: SignUpRequest): Promise<LoginResponse> {
    const user = await this.signup(data);
    const payload: LoginResponse = {
      user,
      message: 'Registration successful',
    };
    this.persistSession(user.id);
    return payload;
  }

  /**
   * Login with email and password
   * POST /auth/login
   */
  async login(
    credentials: LoginRequest & { twoFACode?: string }
  ): Promise<LoginResponse> {
    const response = await this.httpClient.post<LoginResponse>(
      '/api/auth/login',
      credentials
    );
    this.persistSession(response.user.id);
    return response;
  }

  /**
   * Get current authentication status
   * GET /auth/status
   */
  async getStatus(): Promise<User | null> {
    try {
      const response = await this.httpClient.get<User>('/api/auth/status');
      return response ?? null;
    } catch (error) {
      if (error instanceof Error && error.message.includes('401')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Log out current user
   * POST /auth/logout
   */
  async logout(): Promise<void> {
    try {
      await this.httpClient.post<void>('/api/auth/logout', {});
    } catch (error) {
      console.warn('Logout failed:', error);
    }
  }

  /**
   * Initiate 42 OAuth login
   */
  async start42Login(): Promise<OAuthAuthorizationResponse> {
    const response = await this.httpClient.get<OAuthAuthorizationResponse>(
      '/api/auth/42/login'
    );
    return response ?? {
      authorizationUrl: `${window.location.origin}/auth/42/login`,
    };
  }

  async handle42Callback(code: string, state: string): Promise<LoginResponse> {
    const response = await this.httpClient.get<LoginResponse>(
      `/api/auth/42/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(
        state
      )}`
    );
    this.persistSession(response.user.id);
    return response;
  }

  async initiate42Login(): Promise<void> {
    const { authorizationUrl } = await this.start42Login();
    window.location.href = authorizationUrl;
  }

  private persistSession(seed?: string): void {
    // Store user ID in localStorage for future reference
    if (seed) {
      localStorage.setItem('userId', seed);
    }
  }
}

export const authService = new AuthService();
