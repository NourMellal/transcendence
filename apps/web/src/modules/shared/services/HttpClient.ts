// apps/web/src/modules/shared/services/HttpClient.ts (ENHANCED)
import { appState } from '../../../state';
import { navigate } from '../../../routes';
import type {
  RequestInterceptor,
  ResponseInterceptor,
  RequestConfig,
  QueuedRequest,
  ApiResponse
} from '../types/http.types';
import { authEvents } from '../utils/AuthEventEmitter';
import { isTokenExpired } from '../utils/jwtUtils';

export class ApiError extends Error {
  status: number;
  response?: unknown;

  constructor(message: string, status: number, response?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.response = response;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export class HttpClient {
  private baseURL: string;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private refreshPromise: Promise<string> | null = null;
  // Map responses to their originating request config so we can retry accurately
  private responseToRequestMap: WeakMap<Response, { config: RequestConfig; url: string }> = new WeakMap();
  // Queue for requests waiting for token refresh
  private requestQueue: QueuedRequest[] = [];

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.setupDefaultInterceptors();
  }

  /**
   * Set up default interceptors
   */
  private setupDefaultInterceptors(): void {
    // Request interceptor: inject auth token and check expiration
    this.addRequestInterceptor(async (config) => {
      const auth = appState.auth.get();
      // handle headers whether they are plain object or Headers instance
      const hasAuthHeader = config.headers instanceof Headers
        ? config.headers.has('Authorization')
        : Boolean((config.headers as Record<string, string> || {})['Authorization']);

      if (auth?.token && !hasAuthHeader) {
        // Check if token is expired or about to expire (5 min buffer)
        if (isTokenExpired(auth.token, 300)) {
          console.log('[HttpClient] 🔄 Token expiring soon, preemptively refreshing...');
          try {
            const newToken = await this.refreshTokenIfNeeded();
            if (newToken) {
              auth.token = newToken;
            }
          } catch (error) {
            console.warn('[HttpClient] ⚠️ Preemptive refresh failed, will retry on 401:', error);
          }
        }

        if (config.headers instanceof Headers) {
          config.headers.set('Authorization', `Bearer ${auth.token}`);
        } else {
          (config.headers as Record<string, string>) = {
            ...(config.headers as Record<string, string> || {}),
            Authorization: `Bearer ${auth.token}`,
          };
        }
      }
      return config;
    });

    // Response interceptor: handle 401 (token expired or 2FA required)
    this.addResponseInterceptor(async (response) => {
        if (response.status === 401) {
        return this.handleUnauthorized(response);
      }
      return response;
    });
  }

  /**
   * Add custom request interceptor
   */
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * Add custom response interceptor
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * Token helpers used by auth flows
   */
  getAuthToken(): string | null {
    return localStorage.getItem('token');
  }

  setAuthToken(token: string): void {
    localStorage.setItem('token', token);
  }

  clearAuthToken(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, config: Partial<RequestConfig> = {}): Promise<ApiResponse<T>> {
    const finalConfig = await this.applyRequestInterceptors({
      method: 'GET',
      headers: {},
      ...config,
    });

  let response = await fetch(`${this.baseURL}${endpoint}`, finalConfig);
  // remember the originating config & url so we can retry if needed
  this.responseToRequestMap.set(response, { config: finalConfig, url: `${this.baseURL}${endpoint}` });
    response = await this.applyResponseInterceptors(response);

    return this.handleResponse<T>(response);
  }

  /**
   * POST request
   */
  async post<T>(
    endpoint: string,
    body: unknown,
    config: Partial<RequestConfig> = {}
  ): Promise<ApiResponse<T>> {
    const finalConfig = await this.applyRequestInterceptors({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      ...config,
    });

  let response = await fetch(`${this.baseURL}${endpoint}`, finalConfig);
  this.responseToRequestMap.set(response, { config: finalConfig, url: `${this.baseURL}${endpoint}` });
    response = await this.applyResponseInterceptors(response);

    return this.handleResponse<T>(response);
  }

  /**
   * PUT request
   */
  async put<T>(
    endpoint: string,
    body: unknown,
    config: Partial<RequestConfig> = {}
  ): Promise<ApiResponse<T>> {
    const finalConfig = await this.applyRequestInterceptors({
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      ...config,
    });

  let response = await fetch(`${this.baseURL}${endpoint}`, finalConfig);
  this.responseToRequestMap.set(response, { config: finalConfig, url: `${this.baseURL}${endpoint}` });
    response = await this.applyResponseInterceptors(response);

    return this.handleResponse<T>(response);
  }

  /**
   * PATCH request
   */
  async patch<T>(
    endpoint: string,
    body: unknown,
    config: Partial<RequestConfig> = {}
  ): Promise<ApiResponse<T>> {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    const finalConfig = await this.applyRequestInterceptors({
      method: 'PATCH',
      headers: isFormData ? {} : { 'Content-Type': 'application/json' },
      body: isFormData ? body as BodyInit : JSON.stringify(body),
      ...config,
    });

  let response = await fetch(`${this.baseURL}${endpoint}`, finalConfig);
  this.responseToRequestMap.set(response, { config: finalConfig, url: `${this.baseURL}${endpoint}` });
    response = await this.applyResponseInterceptors(response);

    return this.handleResponse<T>(response);
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, config: Partial<RequestConfig> = {}): Promise<ApiResponse<T>> {
    const finalConfig = await this.applyRequestInterceptors({
      method: 'DELETE',
      headers: {},
      ...config,
    });

  let response = await fetch(`${this.baseURL}${endpoint}`, finalConfig);
  this.responseToRequestMap.set(response, { config: finalConfig, url: `${this.baseURL}${endpoint}` });
    response = await this.applyResponseInterceptors(response);

    return this.handleResponse<T>(response);
  }

  // Private methods

  private async applyRequestInterceptors(
    config: RequestConfig
  ): Promise<RequestConfig> {
    let finalConfig = config;

    for (const interceptor of this.requestInterceptors) {
      finalConfig = await interceptor(finalConfig);
    }

    return finalConfig;
  }

  private async applyResponseInterceptors(response: Response): Promise<Response> {
    let finalResponse = response;

    for (const interceptor of this.responseInterceptors) {
      finalResponse = await interceptor(finalResponse);
    }

    return finalResponse;
  }

  private normalizeHeaders(headersInit?: Headers | Record<string, string>): Headers {
    if (headersInit instanceof Headers) {
      return new Headers(headersInit);
    }
    return new Headers(headersInit || {});
  }

  private async handleUnauthorized(response: Response): Promise<Response> {
    // Try to parse error message to determine error type
    let errorData: any;
    try {
      // Clone response to avoid consuming body
      const clonedResponse = response.clone();
      errorData = await clonedResponse.json();
    } catch (e) {
      errorData = { message: response.statusText };
    }

    const errorMessage = errorData?.message || errorData?.error || '';
    console.log('[HttpClient] 🔑 401 detected:', errorMessage);

    // Try to recover the original request config and url we saved earlier
    const originalEntry = this.responseToRequestMap.get(response) || undefined;
    const originalConfig = originalEntry?.config;
    const originalUrl = originalEntry?.url || response.url;

    // Check if this is an auth-related request (login, signup, etc.)
    // These should NOT trigger token refresh - just return the error as-is
    const authPaths = ['/auth/login', '/auth/signup', '/auth/register', '/auth/42/callback'];
    const isAuthRequest = authPaths.some(path => originalUrl.includes(path));
    
    if (isAuthRequest) {
      console.log('[HttpClient] 🔐 Auth request failed with 401, returning original error');
      // Return the response as-is to let the caller handle the error message
      return response;
    }

    // If we've already retried this request, avoid infinite refresh loops
    if (originalConfig && (originalConfig as any)._retry) {
      console.error('[HttpClient] ♻️ Detected retry of an already-retried request — aborting and logging out');
      this.handleLogout('refresh-failed');
      throw new Error('Retry failed after token refresh');
    }

    // Queue this request and process when token is refreshed
    return new Promise<Response>((resolve, reject) => {
      this.requestQueue.push({
        url: originalUrl,
        config: originalConfig || { method: 'GET', headers: {} },
        resolve,
        reject
      });

      // Start refresh if not already in progress
      if (!this.refreshPromise) {
        this.refreshPromise = this.processTokenRefresh();
      }
    });
  }

  /**
   * Process token refresh and replay queued requests
   */
  private async processTokenRefresh(): Promise<string> {
    try {
      const newToken = await this.refreshToken();

      // Update auth Signal and localStorage with new token
      const currentAuth = appState.auth.get();
      if (currentAuth) {
        appState.auth.set({ ...currentAuth, token: newToken });
      }
      localStorage.setItem('token', newToken);

      console.log('[HttpClient] ✅ Token refreshed, replaying %d queued requests', this.requestQueue.length);

      // Emit token refreshed event
      authEvents.emit({ type: 'token-refreshed', newToken });

      // Replay all queued requests with new token
      const queue = [...this.requestQueue];
      this.requestQueue = [];

      for (const queuedRequest of queue) {
        try {
          // Build retry headers
          const retryHeaders = this.normalizeHeaders(queuedRequest.config.headers);
          retryHeaders.set('Authorization', `Bearer ${newToken}`);

          // Mark as retried
          (queuedRequest.config as any)._retry = true;

          const retryResponse = await fetch(queuedRequest.url, {
            ...queuedRequest.config,
            headers: retryHeaders
          });

          queuedRequest.resolve(retryResponse);
        } catch (error) {
          queuedRequest.reject(error as Error);
        }
      }

      return newToken;
    } catch (error) {
      console.error('[HttpClient] ❌ Token refresh failed, logging out');

      // Reject all queued requests
      const queue = [...this.requestQueue];
      this.requestQueue = [];
      queue.forEach(req => req.reject(error as Error));

      // Emit refresh failed event
      authEvents.emit({ type: 'token-refresh-failed', error: error as Error });

      this.handleLogout('refresh-failed');
      throw error;
    } finally {
      this.refreshPromise = null;
    }
  }

  /**
   * Refresh token if needed (wrapper to handle multiple calls)
   */
  private async refreshTokenIfNeeded(): Promise<string | null> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.refreshToken();
    try {
      const newToken = await this.refreshPromise;
      return newToken;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async refreshToken(): Promise<string> {
    const refreshToken = localStorage.getItem('refreshToken');

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${this.baseURL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await response.json();

    localStorage.setItem('refreshToken', data.refreshToken);
    // also persist access token so other parts of app can read it
    if (data.accessToken) {
      localStorage.setItem('token', data.accessToken);
    }

    return data.accessToken;
  }

  /**
   * Logout user with server-side token revocation
   */
  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem('refreshToken');

    // Try to revoke token on server
    if (refreshToken) {
      try {
        await this.post('/auth/logout', { refreshToken });
        console.log('[HttpClient] ✅ Token revoked on server');
      } catch (error) {
        console.warn('[HttpClient] ⚠️ Failed to revoke token on server:', error);
        // Continue with local logout anyway
      }
    }

    this.handleLogout('user-initiated');
  }

  private handleLogout(reason?: 'token-expired' | 'refresh-failed' | 'user-initiated'): void {
    console.log('[HttpClient] 🚪 Logging out, reason:', reason);

    // Emit logout event
    authEvents.emit({ type: 'logout', reason });

    // Reset app auth state
    try {
      appState.auth.set({
        user: null, isLoading: false, token: '',
        isAuthenticated: false
      });
    } catch (e) {
      // if for some reason signal can't be set, still proceed to clear storage
      console.warn('[HttpClient] Unable to reset appState.auth', e);
    }

    // Clear tokens
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');

    // Clear request queue
    this.requestQueue = [];
    this.refreshPromise = null;

    // Redirect to login
    navigate('/auth/login');
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const { status, statusText, headers } = response;
    const isNoContent = status === 204 || headers.get('content-length') === '0';
    const contentType = headers.get('content-type') || '';
    let parsedBody: any;

    if (!isNoContent) {
      if (contentType.includes('application/json')) {
        parsedBody = await response.json().catch(() => undefined);
      } else {
        parsedBody = await response.text().catch(() => undefined);
      }
    }

    if (!response.ok) {
      const message =
        (parsedBody as any)?.message ||
        (parsedBody as any)?.error ||
        `HTTP ${status}: ${statusText}`;
      throw new ApiError(message || 'Request failed', status, parsedBody);
    }

    return {
      data: parsedBody as T,
      status,
      statusText,
      headers,
    };
  }

  // OAuth Methods

  /**
   * Initiate OAuth login flow
   * @param provider - OAuth provider ('42', 'google', 'github')
   */
  async initiateOAuthLogin(provider: '42' | 'google' | 'github' = '42'): Promise<void> {
    const authUrl = `${this.baseURL}/auth/${provider}/login`;
    console.log('[HttpClient] 🔐 Initiating OAuth login with', provider);

    // Redirect to OAuth provider
    window.location.href = authUrl;
  }

  /**
   * Handle OAuth callback (extract tokens from URL params)
   */
  handleOAuthCallback(): { success: boolean; token?: string; userId?: string; error?: string } {
    const urlParams = new URLSearchParams(window.location.search);

    const token = urlParams.get('token');
    const userId = urlParams.get('userId');
    const provider = urlParams.get('provider');
    const error = urlParams.get('error');

    if (error) {
      console.error('[HttpClient] ❌ OAuth callback error:', error);
      return { success: false, error };
    }

    if (token && userId) {
      console.log('[HttpClient] ✅ OAuth callback successful, provider:', provider);

      // Store tokens
      localStorage.setItem('token', token);
      // Backend currently persists only the access token; extend this block when refresh tokens ship.

      // Update app state
      const currentAuth = appState.auth.get();
      appState.auth.set({ ...currentAuth, token, isLoading: false });

      return { success: true, token, userId };
    }

    console.warn('[HttpClient] ⚠️ OAuth callback missing required params');
    return { success: false, error: 'Missing required parameters' };
  }

  /**
   * Check if current URL is an OAuth callback
   */
  isOAuthCallback(): boolean {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.has('token') || urlParams.has('error');
  }
}

const defaultApiBaseUrl =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || '/api';

export const httpClient = new HttpClient(defaultApiBaseUrl);
export default httpClient;

export type { ApiResponse, RequestConfig } from '../types/http.types';
