// apps/web/src/modules/shared/types/http.types.ts

export interface RequestConfig extends RequestInit {
  headers: Record<string, string>;
}

export type RequestInterceptor = (
  config: RequestConfig
) => RequestConfig | Promise<RequestConfig>;

export type ResponseInterceptor = (
  response: Response
) => Response | Promise<Response>;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

// Error types for better error handling
export enum AuthErrorType {
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  TWO_FA_REQUIRED = '2FA_REQUIRED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  REFRESH_FAILED = 'REFRESH_FAILED',
}

export interface AuthError {
  type: AuthErrorType;
  message: string;
  originalError?: Error;
}

// OAuth types
export interface OAuthConfig {
  authorizationUrl: string;
  callbackUrl: string;
  provider: '42' | 'google' | 'github';
}

export interface OAuthCallbackParams {
  code?: string;
  state?: string;
  error?: string;
  token?: string;
  userId?: string;
  provider?: string;
}

// Request retry types
export interface QueuedRequest {
  url: string;
  config: RequestConfig;
  resolve: (response: Response) => void;
  reject: (error: Error) => void;
}

// JWT payload types
export interface JWTPayload {
  sub: string;
  userId: string;
  email: string;
  username: string;
  iat?: number;
  exp?: number;
  iss?: string;
}