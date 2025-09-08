export interface Start42LoginUseCase {
  execute(): { authorizationUrl: string; state: string };
}

export class Start42LoginUseCaseImpl implements Start42LoginUseCase {
  constructor(private clientId: string, private redirectUri: string) {}

  execute(): { authorizationUrl: string; state: string } {
    const state = Math.random().toString(36).substring(7);
    const authorizationUrl = `https://api.intra.42.fr/oauth/authorize?client_id=${this.clientId}&redirect_uri=${encodeURIComponent(this.redirectUri)}&response_type=code&scope=public&state=${state}`;
    return { authorizationUrl, state };
  }
}
