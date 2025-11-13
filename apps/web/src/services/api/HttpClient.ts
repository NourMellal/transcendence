import { Signal } from '../../core/Signal';

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
}

export interface RequestConfig {
  headers?: Record<string, string>;
  body?: any;
}

export interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user?: any;
}

export interface LoadingState {
  isLoading: boolean;
  requestId?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class HttpClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  
  // Reactive state management with Signals
  private authState = new Signal<AuthState>({
    isAuthenticated: false,
    token: null,
    user: undefined
  });
  
  private loadingState = new Signal<LoadingState>({
    isLoading: false,
    requestId: undefined
  });
  
  private activeRequests = new Set<string>();

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
    
    // Initialize auth state from localStorage
    this.initializeAuthState();
  }

  /**
   * Initialize authentication state from localStorage
   */
  private initializeAuthState(): void {
    const token = localStorage.getItem('auth_token');
    const userStr = localStorage.getItem('auth_user');
    
    if (token) {
      const user = userStr ? JSON.parse(userStr) : undefined;
      this.authState.set({
        isAuthenticated: true,
        token,
        user
      });
    }
  }
  
  /**
   * Generate unique request ID for tracking
   */
  private generateRequestId(): string {
    return 'req_' + Date.now() + '_' + Math.random().toString(36).substring(2);
  }
  
  /**
   * Update loading state
   */
  private updateLoadingState(): void {
    const isLoading = this.activeRequests.size > 0;
    this.loadingState.set({
      isLoading,
      requestId: isLoading ? Array.from(this.activeRequests)[0] : undefined
    });
  }

  /**
   * Read current base URL (useful for redirects/logging)
   */
  public getBaseUrl(): string {
    return this.baseUrl;
  }
  
  /**
   * Get the authentication state Signal for reactive subscriptions
   */
  public getAuthState(): Signal<AuthState> {
    return this.authState;
  }
  
  /**
   * Get the loading state Signal for reactive subscriptions
   */
  public getLoadingState(): Signal<LoadingState> {
    return this.loadingState;
  }
  
  /**
   * Check if currently authenticated
   */
  public isAuthenticated(): boolean {
    return this.authState.get().isAuthenticated;
  }
  
  /**
   * Get current user data
   */
  public getCurrentUser(): any {
    return this.authState.get().user;
  }

  /**
   * Get authorization token from localStorage
   */
  public getAuthToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  /**
   * Set authorization token and update reactive auth state
   */
  public setAuthToken(token: string, user?: any): void {
    localStorage.setItem('auth_token', token);
    if (user) {
      localStorage.setItem('auth_user', JSON.stringify(user));
    }
    
    this.authState.set({
      isAuthenticated: true,
      token,
      user
    });
  }

  /**
   * Remove authorization token and update reactive auth state
   */
  public clearAuthToken(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    
    this.authState.set({
      isAuthenticated: false,
      token: null,
      user: undefined
    });
  }
  
  /**
   * Login with credentials and update auth state
   */
  public async login(credentials: { email: string; password: string }): Promise<ApiResponse<any>> {
    const response = await this.post<{ token: string; user: any }>('/auth/login', credentials);
    
    if (response.data?.token) {
      this.setAuthToken(response.data.token, response.data.user);
    }
    
    return response;
  }
  
  /**
   * Logout and clear auth state
   */
  public async logout(): Promise<void> {
    try {
      // Attempt to notify server of logout
      await this.post('/auth/logout');
    } catch (error) {
      // Continue with local logout even if server request fails
      console.warn('Logout request failed, proceeding with local logout:', error);
    } finally {
      this.clearAuthToken();
    }
  }
  
  /**
   * Refresh authentication token
   */
  public async refreshToken(): Promise<ApiResponse<any>> {
    const response = await this.post<{ token: string; user: any }>('/auth/refresh');
    
    if (response.data?.token) {
      this.setAuthToken(response.data.token, response.data.user);
    }
    
    return response;
  }

  /**
   * Build headers with authorization if token exists
   */
  private buildHeaders(customHeaders?: Record<string, string>): Record<string, string> {
    const headers = { ...this.defaultHeaders };
    
    const token = this.getAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    if (customHeaders) {
      Object.assign(headers, customHeaders);
    }

    return headers;
  }

  /**
   * Handle fetch response and convert to ApiResponse
   */
  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const status = response.status;
    let data: any;
    
    try {
      const text = await response.text();
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (!response.ok) {
      const errorMessage = data?.message || data?.error || `HTTP ${status}: ${response.statusText}`;
      throw new ApiError(errorMessage, status, data);
    }

    return {
      data,
      status,
    };
  }

  /**
   * Generic request method with reactive loading state
   */
  private async request<T>(
    method: string,
    url: string,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    const requestId = this.generateRequestId();
    
    try {
      // Track loading state
      this.activeRequests.add(requestId);
      this.updateLoadingState();
      
      const fullUrl = `${this.baseUrl}${url}`;
      const headers = this.buildHeaders(config?.headers);

      const fetchConfig: RequestInit = {
        method,
        headers,
      };

      if (config?.body && method !== 'GET') {
        if (config.body instanceof FormData) {
          // Remove Content-Type for FormData (browser sets it with boundary)
          delete headers['Content-Type'];
          fetchConfig.body = config.body;
        } else {
          fetchConfig.body = JSON.stringify(config.body);
        }
      }

      const response = await fetch(fullUrl, fetchConfig);
      const result = await this.handleResponse<T>(response);
      
      return result;
      
    } catch (error) {
      // Handle authentication errors
      if (error instanceof ApiError && error.status === 401) {
        this.clearAuthToken();
      }
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      // Network error or other fetch errors
      throw new ApiError(
        error instanceof Error ? error.message : 'Network error occurred',
        0
      );
    } finally {
      // Always clean up loading state
      this.activeRequests.delete(requestId);
      this.updateLoadingState();
    }
  }

  /**
   * GET request
   */
  public async get<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('GET', url, config);
  }

  /**
   * POST request
   */
  public async post<T>(url: string, body?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('POST', url, { ...config, body });
  }

  /**
   * PUT request
   */
  public async put<T>(url: string, body?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', url, { ...config, body });
  }

  /**
   * PATCH request
   */
  public async patch<T>(url: string, body?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', url, { ...config, body });
  }

  /**
   * DELETE request
   */
  public async delete<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', url, config);
  }
  
  /**
   * Subscribe to authentication state changes
   */
  public onAuthStateChange(callback: (state: AuthState) => void): () => void {
    return this.authState.subscribe(callback);
  }
  
  /**
   * Subscribe to loading state changes
   */
  public onLoadingStateChange(callback: (state: LoadingState) => void): () => void {
    return this.loadingState.subscribe(callback);
  }
  
  /**
   * Create an authenticated HTTP client instance
   * This is useful for components that need reactive HTTP functionality
   */
  public static createAuthenticatedClient(baseUrl?: string): HttpClient {
    return new HttpClient(baseUrl);
  }
  
  /**
   * Helper method to handle API calls with automatic error handling
   */
  public async safeRequest<T>(
    requestFn: () => Promise<ApiResponse<T>>,
    onError?: (error: ApiError) => void
  ): Promise<T | null> {
    try {
      const response = await requestFn();
      return response.data || null;
    } catch (error) {
      if (error instanceof ApiError) {
        if (onError) {
          onError(error);
        } else {
          console.error('API Error:', error.message, 'Status:', error.status);
        }
      } else {
        console.error('Unexpected error:', error);
      }
      return null;
    }
  }
}
