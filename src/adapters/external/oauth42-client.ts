export interface OAuth42Client {
  exchangeCode(code: string): Promise<{ access_token: string }>;
  getUserInfo(accessToken: string): Promise<{
    id: number;
    email: string;
    login: string;
  }>;
}

// MOCK IMPLEMENTATION - Replace with real 42 API integration for production
export class FortyTwoOAuthClient implements OAuth42Client {
  constructor(
    private clientId: string,
    private clientSecret: string,
    private redirectUri: string
  ) {}

  async exchangeCode(code: string): Promise<{ access_token: string }> {
    // MOCK: In production, exchange code with 42 API using clientId, clientSecret, redirectUri
    console.log(`MOCK: Exchanging code ${code} for access token`);
    return { access_token: 'mock_access_token_12345' };
  }

  async getUserInfo(accessToken: string): Promise<{
    id: number;
    email: string;
    login: string;
  }> {
    // MOCK: In production, fetch user info from 42 API using accessToken
    console.log(`MOCK: Fetching user info with token ${accessToken}`);
    return { 
      id: 42000, 
      email: 'mock.user@student.42.fr', 
      login: 'mockuser' 
    };
  }
}
