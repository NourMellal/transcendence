/**
 * Authentication service
 * Handles all authentication-related API calls
 */

import httpClient, { HttpClient } from '../../modules/shared/services/HttpClient';
import type { User } from '../../models/User';
import type { UserDTOs } from '../../models/User';
import type { SignUpRequest, LoginRequest, LoginResponse } from '../../models/Auth';
import { appState } from '../../state';

export class AuthService {
  // use the existing instance by default
  constructor(private readonly http: HttpClient = httpClient) {
    // No-op; callers should invoke hydrateFromStorage() during app bootstrap
  }

  private normalizeUser(user: any): User {
    if (!user || typeof user !== 'object') {
      throw new Error('Invalid user payload');
    }

    const isTwoFAEnabled =
      typeof (user as any).isTwoFAEnabled === 'boolean'
        ? (user as any).isTwoFAEnabled
        : typeof (user as any).is2FAEnabled === 'boolean'
          ? (user as any).is2FAEnabled
          : false;

    return {
      ...(user as User),
      isTwoFAEnabled,
    };
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
    // Backend expects `totpCode`; keep `twoFACode` as a UI-friendly alias.
    const payload: Record<string, unknown> = {
      ...credentials,
      totpCode: (credentials as any).totpCode ?? credentials.twoFACode,
    };
    delete (payload as any).twoFACode;

    const response = await this.http.post<LoginResponse>(
      '/auth/login',
      payload
    );

    const data = response.data!;

    // Normalize user payload field naming (some APIs use `is2FAEnabled`).
    if (data.user && typeof (data.user as any).isTwoFAEnabled !== 'boolean' && typeof (data.user as any).is2FAEnabled === 'boolean') {
      (data.user as any).isTwoFAEnabled = (data.user as any).is2FAEnabled;
    }

    if (data.accessToken && data.refreshToken) {
      this.persistTokens(data.accessToken, data.refreshToken, data.user);

      // Prefer the authoritative backend profile (includes presence status).
      try {
        const profile = await this.http.get<User>('/users/me');
        if (profile.data) {
          const normalized = this.normalizeUser(profile.data);
          const current = appState.auth.get();
          appState.auth.set({ ...current, user: normalized });
          data.user = normalized;
        }
      } catch (err) {
        console.warn('Failed to hydrate user after login', err);
      }
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
          user = profile.data ? this.normalizeUser(profile.data) : undefined;
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
   * Generate a new 2FA secret + QR code
   * POST /auth/2fa/generate
   */
  async generate2FA(): Promise<UserDTOs.Generate2FAResponse> {
    const response = await this.http.post<UserDTOs.Generate2FAResponse>('/auth/2fa/generate', {});
    return response.data!;
  }

  /**
   * Enable 2FA using a TOTP code
   * POST /auth/2fa/enable
   */
  async enable2FA(payload: UserDTOs.Enable2FARequest): Promise<{ message?: string }> {
    const response = await this.http.post<{ message?: string }>('/auth/2fa/enable', payload);
    return response.data ?? {};
  }

  /**
   * Disable 2FA using a TOTP code
   * POST /auth/2fa/disable
   */
  async disable2FA(payload: UserDTOs.Disable2FARequest): Promise<{ message?: string }> {
    const response = await this.http.post<{ message?: string }>('/auth/2fa/disable', payload);
    return response.data ?? {};
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

      // Prefer the authoritative backend profile (includes presence status).
      let profileUser = user;
      if (user) {
        try {
          const profile = await this.http.get<User>('/users/me');
          profileUser = profile.data ? this.normalizeUser(profile.data) : user;
        } catch (err) {
          console.warn('Failed to hydrate user profile after restore', err);
        }
      }

      const latest = appState.auth.get();
      appState.auth.set({
        ...latest,
        user: profileUser,
        isAuthenticated: Boolean(profileUser),
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
