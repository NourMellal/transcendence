// apps/web/src/modules/shared/services/HttpClient.ts (ENHANCEMENT)
import { appState } from '../../../state';
import { navigate } from '../../../routes';
import type { 
  RequestInterceptor, 
  ResponseInterceptor, 
  RequestConfig 
} from '../types/http.types';

export class HttpClient {
  private baseURL: string;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private refreshPromise: Promise<string> | null = null;
  // Map responses to their originating request config so we can retry accurately
  private responseToRequestMap: WeakMap<Response, { config: RequestConfig; url: string }> = new WeakMap();

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.setupDefaultInterceptors();
  }

  /**
   * Set up default interceptors
   */
  private setupDefaultInterceptors(): void {
    // Request interceptor: inject auth token
    this.addRequestInterceptor((config) => {
      const auth = appState.auth.get();
      // handle headers whether they are plain object or Headers instance
      const hasAuthHeader = config.headers instanceof Headers
        ? config.headers.has('Authorization')
        : Boolean((config.headers as Record<string, string> || {})['Authorization']);

      if (auth?.token && !hasAuthHeader) {
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

    // Response interceptor: handle 401 (token expired)
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
   * GET request
   */
  async get<T>(endpoint: string, config: Partial<RequestConfig> = {}): Promise<T> {
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
  ): Promise<T> {
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
  ): Promise<T> {
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
   * DELETE request
   */
  async delete<T>(endpoint: string, config: Partial<RequestConfig> = {}): Promise<T> {
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

  private async handleUnauthorized(response: Response): Promise<Response> {
    console.log('[HttpClient] 🔑 401 detected, refreshing token...');
    // Try to recover the original request config and url we saved earlier
    const originalEntry = this.responseToRequestMap.get(response) || undefined;
    const originalConfig = originalEntry?.config;
    const originalUrl = originalEntry?.url || response.url;

    // If we've already retried this request, avoid infinite refresh loops
    if (originalConfig && (originalConfig as any)._retry) {
      console.error('[HttpClient] ♻️ Detected retry of an already-retried request — aborting and logging out');
      this.handleLogout();
      throw new Error('Retry failed after token refresh');
    }

    // Prevent multiple simultaneous refresh requests
    if (!this.refreshPromise) {
      this.refreshPromise = this.refreshToken();
    }

    try {
      const newToken = await this.refreshPromise;
      
      // Update auth Signal and localStorage with new token
      const currentAuth = appState.auth.get();
      if (currentAuth) {
        appState.auth.set({ ...currentAuth, token: newToken });
      }
      localStorage.setItem('token', newToken);

      console.log('[HttpClient] ✅ Token refreshed, retrying request');

      // Build retry headers from original request config
      let retryHeaders = new Headers();
      if (originalConfig) {
        if (originalConfig.headers instanceof Headers) {
          retryHeaders = new Headers(originalConfig.headers as Headers);
        } else if (originalConfig.headers && typeof originalConfig.headers === 'object') {
          retryHeaders = new Headers(originalConfig.headers as Record<string, string>);
        }
      }
      retryHeaders.set('Authorization', `Bearer ${newToken}`);

      // Mark as retried to avoid infinite loops
      if (originalConfig) {
        (originalConfig as any)._retry = true;
      }

      const retryOptions: RequestInit = {
        ...(originalConfig as any || {}),
        headers: retryHeaders,
      };

      return fetch(originalUrl, retryOptions);
    } catch (error) {
      console.error('[HttpClient] ❌ Token refresh failed, logging out');
      this.handleLogout();
      throw error;
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

  private handleLogout(): void {
    // Reset app auth state
    try {
      appState.auth.set({ user: null, isLoading: false, token: '' });
    } catch (e) {
      // if for some reason signal can't be set, still proceed to clear storage
      console.warn('[HttpClient] Unable to reset appState.auth', e);
    }

    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    navigate('/login');
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(error.message || 'Request failed');
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }
}

export const httpClient = new HttpClient(
   'http://localhost:3000/api'
);