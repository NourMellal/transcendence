export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
}

export interface RequestConfig {
  headers?: Record<string, string>;
  body?: any;
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
  private token: string | null = null;
  private tokenUnsub: (() => void) | null = null;

  /**
   * @param baseUrl Base API URL (default: '/api')
   * @param tokenSignal Optional Signal<string|null> that publishes auth token changes
   */
  constructor(baseUrl: string = '/api', tokenSignal?: import("../../core/signal").default<string | null>) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };

    if (tokenSignal) {
      // initialize and subscribe to token changes
      try {
        this.token = tokenSignal.get();
        this.tokenUnsub = tokenSignal.subscribe((t) => {
          this.token = t;
        });
      } catch (e) {
        // ignore signal subscription errors
      }
    }
  }

  /**
   * Read current base URL (useful for redirects/logging)
   */
  public getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Get authorization token from localStorage
   */
  public getAuthToken(): string | null {
    if (this.token !== null && this.token !== undefined) return this.token;
    return localStorage.getItem('auth_token');
  }

  /**
   * Set authorization token in localStorage
   */
  public setAuthToken(token: string): void {
    try {
      localStorage.setItem('auth_token', token);
    } catch (e) {
    }
    this.token = token;
  }

  /**
   * Remove authorization token from localStorage
   */
  public clearAuthToken(): void {
    localStorage.removeItem('auth_token');
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
   * Generic request method
   */
  private async request<T>(
    method: string,
    url: string,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
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

    // Use AbortController to allow future timeout/cancellation support.
    const controller = new AbortController();
    (fetchConfig as any).signal = controller.signal;

    try {
      const response = await fetch(fullUrl, fetchConfig);
      return this.handleResponse<T>(response);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      // Normalize fetch/network errors as ApiError with status 0
      const message = error instanceof Error ? error.message : 'Network error occurred';
      throw new ApiError(message, 0);
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
}
