/**
 * Authentication service
 * Handles all authentication-related API calls
 */

import { ApiError, HttpClient } from '../api/HttpClient';
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
    const response = await this.httpClient.post<User>('/auth/signup', data);
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
      '/auth/login',
      credentials
    );
    const data = response.data!;
    this.persistSession(data.user.id);
    return data;
  }

  /**
   * Get current authentication status
   * GET /auth/status
   */
  async getStatus(): Promise<User | null> {
    try {
      const response = await this.httpClient.get<User>('/auth/status');
      return response.data ?? null;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
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
    await this.httpClient.post<void>('/auth/logout');
    this.httpClient.clearAuthToken();
  }

  /**
   * Initiate 42 OAuth login
   */
  async start42Login(): Promise<OAuthAuthorizationResponse> {
    const response = await this.httpClient.get<OAuthAuthorizationResponse>(
      '/auth/42/login'
    );
    return (
      response.data ?? {
        authorizationUrl: `${window.location.origin}/auth/42/login`,
      }
    );
  }

  async handle42Callback(code: string, state: string): Promise<LoginResponse> {
    const response = await this.httpClient.get<LoginResponse>(
      `/auth/42/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(
        state
      )}`
    );
    const data = response.data!;
    this.persistSession(data.user.id);
    return data;
  }

  async initiate42Login(): Promise<void> {
    const { authorizationUrl } = await this.start42Login();
    window.location.href = authorizationUrl;
  }

  private persistSession(seed?: string): void {
    const token = this.httpClient.getAuthToken();
    if (!token) {
      this.httpClient.setAuthToken(seed ?? crypto.randomUUID());
    }
  }
}

export const authService = new AuthService();
