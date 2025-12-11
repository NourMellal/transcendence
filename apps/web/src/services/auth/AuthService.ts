/**
 * Authentication service
 * Handles all authentication-related API calls
 */

import httpClient, { HttpClient } from '../../modules/shared/services/HttpClient';
import type { User } from '../../models/User';
import type { SignUpRequest, LoginRequest, LoginResponse } from '../../models/Auth';
import { appState } from '../../state';

export class AuthService {
  // use the existing instance by default
  constructor(private readonly http: HttpClient = httpClient) {
    // No-op; callers should invoke hydrateFromStorage() during app bootstrap
  }

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
    await this.signup(data);
    return this.login({ email: data.email, password: data.password });
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
    if (data.accessToken && data.refreshToken) {
      this.persistTokens(data.accessToken, data.refreshToken, data.user);
    }
    return data;
  }

  /**
   * Get current authentication status
   * GET /auth/status
   */
  async getStatus(): Promise<User | null> {
    try {
      const response = await this.http.get<{ authenticated: boolean; user?: User }>('/auth/status');
      return response.data?.user ?? null;
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
      await this.http.logout();
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
    const response = await this.http.get<Record<string, any>>(
      `/auth/42/callback?code=${encodeURIComponent(
        code
      )}&state=${encodeURIComponent(state)}`
    );

    const payload = response.data ?? {};
    const accessToken = payload.sessionToken || payload.accessToken || payload.token;
    const refreshToken = payload.refreshToken as string | undefined;
    let user = payload.user as User | undefined;

    if (accessToken && refreshToken) {
      this.persistTokens(accessToken, refreshToken, user);
      if (!user) {
        try {
          const profile = await this.http.get<User>('/users/me');
          user = profile.data ?? undefined;
          if (user) {
            const current = appState.auth.get();
            appState.auth.set({ ...current, user });
          }
        } catch (err) {
          console.warn('Failed to hydrate user after OAuth callback', err);
        }
      }
    }

    return {
      user,
      accessToken,
      refreshToken,
      message: payload.message,
    };
  }

  async initiate42Login(): Promise<void> {
    this.start42Login();
  }

  /**
   * Restore session from localStorage and hydrate user profile.
   * Should be called once during app bootstrap.
   */
  async hydrateFromStorage(): Promise<void> {
    const token = localStorage.getItem('token');
    const refreshToken = localStorage.getItem('refreshToken') || undefined;
    if (!token) return;

    this.http.setAuthToken(token);
    const current = appState.auth.get();
    appState.auth.set({
      ...current,
      token,
      refreshToken: refreshToken ?? current.refreshToken,
      isAuthenticated: true,
      isLoading: true,
    });

    try {
      const user = await this.getStatus();
      const latest = appState.auth.get();
      appState.auth.set({
        ...latest,
        user,
        isAuthenticated: Boolean(user),
        isLoading: false,
      });
    } catch (error) {
      // If the token is invalid/expired, clear it to avoid loops
      console.warn('Failed to restore session, clearing tokens', error);
      await this.logout();
      const reset = appState.auth.get();
      appState.auth.set({
        ...reset,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }

  private persistTokens(accessToken: string, refreshToken: string, user?: User | null): void {
    this.http.setAuthToken(accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    const current = appState.auth.get();
    appState.auth.set({
      ...current,
      user: user ?? current.user,
      token: accessToken,
      refreshToken,
      isAuthenticated: true,
      isLoading: false,
    });
  }
}

// 👇 uses the imported shared instance, no new HttpClient here
export const authService = new AuthService();
