
export interface RequestConfig extends RequestInit {
  headers: Headers | Record<string, string>;
}

export type RequestInterceptor = (
  config: RequestConfig
) => RequestConfig | Promise<RequestConfig>;

export type ResponseInterceptor = (
  response: Response
) => Response | Promise<Response>;

export interface ApiResponse<T = unknown> {
  data?: T;
  status: number;
  statusText?: string;
  headers: Headers;
}


export interface QueuedRequest {
  url: string;
  config: RequestConfig;
  resolve: (response: Response) => void;
  reject: (error: Error) => void;
}

export interface JWTPayload {
  sub: string;
  userId: string;
  email: string;
  username: string;
  iat?: number;
  exp?: number;
  iss?: string;
}
