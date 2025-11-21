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
  constructor(message: string, public status: number, public response?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

export class HttpClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private token: string | null = null;
  private tokenUnsub: (() => void) | null = null;

  constructor(baseUrl: string = '/api', tokenSignal?: import("../../core/signal").default<string | null>) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = { 'Content-Type': 'application/json' };
    if (tokenSignal) {
      try {
        this.token = tokenSignal.get();
        this.tokenUnsub = tokenSignal.subscribe((t) => { this.token = t; });
      } catch (e) {}
    }
  }

  public getBaseUrl(): string { return this.baseUrl; }

  public getAuthToken(): string | null {
    if (this.token !== null && this.token !== undefined) return this.token;
    return localStorage.getItem('auth_token');
  }

  public setAuthToken(token: string): void { try { localStorage.setItem('auth_token', token); } catch (e) {} this.token = token; }

  public clearAuthToken(): void { try { localStorage.removeItem('auth_token'); } catch (e) {} }

  private buildHeaders(customHeaders?: Record<string, string>): Record<string, string> {
    const headers = { ...this.defaultHeaders };
    const token = this.getAuthToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    if (customHeaders) Object.assign(headers, customHeaders);
    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const status = response.status;
    let data: any;
    try { const text = await response.text(); data = text ? JSON.parse(text) : null; } catch { data = null; }
    if (!response.ok) throw new ApiError(data?.message || data?.error || `HTTP ${status}: ${response.statusText}`, status, data);
    return { data, status };
  }

  private async request<T>(method: string, url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    const fullUrl = `${this.baseUrl}${url}`;
    const headers = this.buildHeaders(config?.headers);
    const fetchConfig: RequestInit = { method, headers };
    if (config?.body && method !== 'GET') {
      if (config.body instanceof FormData) { delete headers['Content-Type']; fetchConfig.body = config.body; }
      else fetchConfig.body = JSON.stringify(config.body);
    }
    const controller = new AbortController();
    (fetchConfig as any).signal = controller.signal;
    try { const response = await fetch(fullUrl, fetchConfig); return this.handleResponse<T>(response); }
    catch (error) { if (error instanceof ApiError) throw error; const message = error instanceof Error ? error.message : 'Network error occurred'; throw new ApiError(message, 0); }
  }

  public async get<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> { return this.request<T>('GET', url, config); }
  public async post<T>(url: string, body?: any, config?: RequestConfig): Promise<ApiResponse<T>> { return this.request<T>('POST', url, { ...config, body }); }
  public async put<T>(url: string, body?: any, config?: RequestConfig): Promise<ApiResponse<T>> { return this.request<T>('PUT', url, { ...config, body }); }
  public async patch<T>(url: string, body?: any, config?: RequestConfig): Promise<ApiResponse<T>> { return this.request<T>('PATCH', url, { ...config, body }); }
  public async delete<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> { return this.request<T>('DELETE', url, config); }
}
