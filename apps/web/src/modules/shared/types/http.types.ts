// apps/web/src/modules/shared/types/http.types.ts (NEW)

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