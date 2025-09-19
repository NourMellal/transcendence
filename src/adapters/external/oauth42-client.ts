export interface OAuth42Client {
  exchangeCode(code: string): Promise<{ access_token: string }>;
  getUserInfo(accessToken: string): Promise<{
    id: number;
    email: string;
    login: string;
  }>;
}

export class FortyTwoOAuthClient implements OAuth42Client {
  constructor(
    private clientId: string,
    private clientSecret: string,
    private redirectUri: string
  ) {}

  async exchangeCode(code: string): Promise<{ access_token: string }> {
    // Implement token exchange with 42 API
    return { access_token: '' };
  }

  async getUserInfo(accessToken: string): Promise<{
    id: number;
    email: string;
    login: string;
  }> {
    // Implement user info fetch from 42 API
    return { id: 0, email: '', login: '' };
  }
}
