/**
 * Authentication service
 * Handles all authentication-related API calls
 */

import { HttpClient } from '../api/HttpClient';
import type { User } from '../../models/User';
import type { SignUpRequest, LoginRequest, LoginResponse } from '../../models/Auth';

export class AuthService {
  private httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  /**
   * Register a new user
   * POST /auth/signup
   */
  async signup(data: SignUpRequest): Promise<User> {
    const user = await this.httpClient.post<User>('/auth/signup', data);
    return user;
  }

  /**
   * Login with email and password
   * POST /auth/login
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await this.httpClient.post<LoginResponse>(
      '/auth/login',
      credentials
    );
    
    // Note: With MSW mocking, we don't have an actual JWT token
    // In real implementation, the token would be returned by the backend
    // and stored here: localStorage.setItem('authToken', response.token);
    
    return response;
  }

  /**
   * Get current authentication status
   * GET /auth/status
   */
  async getStatus(): Promise<User | null> {
    try {
      const user = await this.httpClient.get<User>('/auth/status');
      return user;
    } catch (error) {
      // 401 means not authenticated
      if ((error as { status?: number }).status === 401) {
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
    // Clean up stored auth token if it exists
    localStorage.removeItem('authToken');
  }

  /**
   * Initiate 42 OAuth login
   * This redirects to 42's SSO, so no fetch call needed
   */
  initiate42Login(): void {
    window.location.href = `${this.httpClient.getBaseURL()}/auth/42/login`;
  }
}
