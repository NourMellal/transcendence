/**
 * Authentication service
 * Handles all authentication-related API calls
 */

import httpClient, { HttpClient } from '../../modules/shared/services/HttpClient';
import type { User } from '../../models/User';
import type { SignUpRequest, LoginRequest, LoginResponse } from '../../models/Auth';

type OAuthAuthorizationResponse = {
  authorizationUrl: string;
};

export class AuthService {
  // use the existing instance by default
  constructor(private readonly http: HttpClient = httpClient) {}

  /**
   * Register a new user
   * POST /auth/signup
   */
  async signup(data: SignUpRequest): Promise<User> {
    const response = await this.http.post<User>('/auth/signup', data);
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
    const response = await this.http.post<LoginResponse>(
      '/auth/login',
      credentials
    );

    const data = response.data!;
    this.persistSession(data.user!.id);
    return data;
  }

  /**
   * Get current authentication status
   * GET /auth/status
   */
  async getStatus(): Promise<User | null> {
    try {
      const response = await this.http.get<User>('/auth/status');
      return response.data ?? null;
    } catch (error: any) {
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
      await this.http.post<void>('/auth/logout', {});
    } catch (error) {
      console.warn('Logout failed:', error);
    }
  }

  /**
   * Initiate 42 OAuth login
   */
  start42Login(): void {
    // Redirect browser to gateway route; no fetch to 42.fr to avoid CORS issues
    window.location.href = '/api/auth/42/login';
  }

  async handle42Callback(code: string, state: string): Promise<LoginResponse> {
    const response = await this.http.get<LoginResponse>(
      `/auth/42/callback?code=${encodeURIComponent(
        code
      )}&state=${encodeURIComponent(state)}`
    );

    const data = response.data!;
    this.persistSession(data.user!.id);
    return data;
  }

  async initiate42Login(): Promise<void> {
    this.start42Login();
  }

  private persistSession(seed?: string): void {
    if (seed) {
      localStorage.setItem('userId', seed);
    }
  }
}

// 👇 uses the imported shared instance, no new HttpClient here
export const authService = new AuthService();
