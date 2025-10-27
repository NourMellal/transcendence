import { OAuthService, OAuth42Profile } from '../../domain/ports';

export class OAuth42Service implements OAuthService {
    private clientId: string;
    private clientSecret: string;
    private callbackUrl: string;

    constructor(clientId: string, clientSecret: string, callbackUrl: string) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.callbackUrl = callbackUrl;
    }

    /**
     * Generate OAuth 42 authorization URL
     */
    getAuthorizationUrl(state: string): string {
        const params = new URLSearchParams({
            client_id: this.clientId,
            redirect_uri: this.callbackUrl,
            response_type: 'code',
            scope: 'public',
            state: state
        });

        return `https://api.intra.42.fr/oauth/authorize?${params.toString()}`;
    }

    /**
     * Exchange authorization code for user profile
     */
    async exchangeCodeForProfile(code: string): Promise<OAuth42Profile> {
        try {
            // Step 1: Exchange code for access token
            const tokenResponse = await fetch('https://api.intra.42.fr/oauth/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    grant_type: 'authorization_code',
                    client_id: this.clientId,
                    client_secret: this.clientSecret,
                    code: code,
                    redirect_uri: this.callbackUrl
                })
            });

            if (!tokenResponse.ok) {
                throw new Error(`Token exchange failed: ${tokenResponse.status}`);
            }

            const tokenData = await tokenResponse.json();
            const accessToken = tokenData.access_token;

            // Step 2: Get user profile
            const profileResponse = await fetch('https://api.intra.42.fr/v2/me', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            if (!profileResponse.ok) {
                throw new Error(`Profile fetch failed: ${profileResponse.status}`);
            }

            const profile = await profileResponse.json();

            // Return standardized profile
            return {
                id: profile.id,
                email: profile.email,
                login: profile.login,
                first_name: profile.first_name,
                last_name: profile.last_name,
                image: {
                    link: profile.image?.link || `https://cdn.intra.42.fr/users/${profile.login}.jpg`
                }
            };

        } catch (error) {
            throw new Error(`OAuth 42 authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
