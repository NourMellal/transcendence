import { createUserServiceVault } from '@transcendence/shared-utils';
import type { OAuthService, OAuth42Profile } from '../../domain/ports';

interface OAuth42Config {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    authorizeUrl: string;
    tokenUrl: string;
    profileUrl: string;
    scope: string;
}

/**
 * Adapter that talks to the official 42 OAuth API.
 * Uses Vault (with env fallback) to obtain credentials.
 */
export class OAuth42Service implements OAuthService {
    private readonly vaultHelper = createUserServiceVault();
    private initialized = false;
    private config!: OAuth42Config;

    constructor(private readonly options: Partial<OAuth42Config> = {}) { }

    async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }

        try {
            await this.vaultHelper.initialize();
        } catch (error) {
            console.warn('[OAuth42Service] Failed to initialize via Vault:', (error as Error).message);
        }

        const apiConfig = await this.vaultHelper.getAPIConfig();

        const redirectUri =
            process.env.OAUTH_42_REDIRECT_URI ||
            apiConfig?.['42_redirect_uri'] ||
            this.options.redirectUri ||
            'http://localhost:3001/auth/42/callback';

        this.config = {
            clientId:
                process.env.OAUTH_42_CLIENT_ID ||
                apiConfig?.['42_client_id'] ||
                this.options.clientId ||
                '',
            clientSecret:
                process.env.OAUTH_42_CLIENT_SECRET ||
                apiConfig?.['42_client_secret'] ||
                this.options.clientSecret ||
                '',
            redirectUri,
            authorizeUrl:
                process.env.OAUTH_42_AUTHORIZE_URL ||
                apiConfig?.['42_authorize_url'] ||
                this.options.authorizeUrl ||
                'https://api.intra.42.fr/oauth/authorize',
            tokenUrl:
                process.env.OAUTH_42_TOKEN_URL ||
                apiConfig?.['42_token_url'] ||
                this.options.tokenUrl ||
                'https://api.intra.42.fr/oauth/token',
            profileUrl:
                process.env.OAUTH_42_PROFILE_URL ||
                apiConfig?.['42_profile_url'] ||
                this.options.profileUrl ||
                'https://api.intra.42.fr/v2/me',
            scope:
                process.env.OAUTH_42_SCOPE ||
                apiConfig?.['42_scope'] ||
                this.options.scope ||
                'public',
        };
        this.initialized = true;

        if (!this.config) {
            throw new Error('OAuth42 configuration is missing');
        }
        if (!this.config.clientId || !this.config.clientSecret) {
            console.warn('[OAuth42Service] Client ID/Secret missing. OAuth login will fail until configured.');
        }
    }

    getAuthorizationUrl(state: string): string {
        this.ensureInitialized();
        const { authorizeUrl, clientId, redirectUri, scope } = this.config;

        const url = new URL(authorizeUrl);
        url.searchParams.set('client_id', clientId);
        url.searchParams.set('redirect_uri', redirectUri);
        url.searchParams.set('response_type', 'code');
        url.searchParams.set('scope', scope);
        url.searchParams.set('state', state);

        return url.toString();
    }

    async exchangeCodeForProfile(code: string): Promise<OAuth42Profile> {
        this.ensureInitialized();
        const { tokenUrl, profileUrl, clientId, clientSecret, redirectUri } = this.config;

        const tokenResponse = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                grant_type: 'authorization_code',
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                code,
            }),
        });

        if (!tokenResponse.ok) {
            const body = await tokenResponse.text();
            throw new Error(`Failed to exchange code for token: ${tokenResponse.status} ${body}`);
        }

        const tokenData = await tokenResponse.json() as { access_token?: string };
        if (!tokenData.access_token) {
            throw new Error('OAuth token response missing access_token');
        }

        const profileResponse = await fetch(profileUrl, {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
            },
        });

        if (!profileResponse.ok) {
            const body = await profileResponse.text();
            throw new Error(`Failed to fetch profile: ${profileResponse.status} ${body}`);
        }

        const profile = await profileResponse.json() as OAuth42Profile;
        return profile;
    }

    private ensureInitialized(): void {
        if (!this.initialized) {
            throw new Error('OAuth42Service not initialized');
        }
    }
}

export const createOAuth42Service = () => new OAuth42Service();
