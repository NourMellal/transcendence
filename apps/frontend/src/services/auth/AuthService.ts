import { HttpClient } from '../api/HttpClient';
import { User } from '../../../models/User'
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token?: string;
  user: User;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  id: string;
  username: string;
  email: string;
  createdAt: string;
}

export interface ApiError {
  message: string;
  statusCode: number;
}

export class AuthService {
  private http: HttpClient;

  constructor(baseURL: string = '/api') {
    this.http = new HttpClient(baseURL);
  }

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await this.http.post<LoginResponse>('/auth/login', credentials);
      if (response.token) {
        this.http.setToken(response.token);
      }
      return response;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async register(userData: RegisterRequest): Promise<RegisterResponse> {
    try {
      return await this.http.post<RegisterResponse>('/auth/register', userData);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async logout(): Promise<void> {
    try {
      await this.http.post('/auth/logout', {});
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.http.clearToken();
    }
  }

  async getCurrentUser(): Promise<LoginResponse['user']> {
    try {
      return await this.http.get<LoginResponse['user']>('/auth/me');
    } catch (error) {
      throw this.handleError(error);
    }
  }

  isAuthenticated(): boolean {
    return this.http.isAuthenticated();
  }

  private handleError(error: unknown): Error {
    if (error instanceof Error) {
      const anyErr = error as any;
      const message = anyErr?.body?.message || anyErr.message || 'Request failed';
      const e = new Error(message);
      try {
        (e as any).status = anyErr.status;
        (e as any).body = anyErr.body;
      } catch {
        // ignore
      }
      return e;
    }
    return new Error('An unexpected error occurred');
  }
}