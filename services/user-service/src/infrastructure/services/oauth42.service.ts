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
    private enabled = false;
    private config!: OAuth42Config;

    constructor() { }

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
        const pickValue = (value?: string): string | undefined =>
            typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
        const resolveConfigValue = (envKey: string, vaultKey: string, fallback?: string): string | undefined =>
            pickValue(apiConfig?.[vaultKey]) ?? pickValue(process.env[envKey]) ?? fallback;

        const clientId = resolveConfigValue('OAUTH_42_CLIENT_ID', '42_client_id');
        const clientSecret = resolveConfigValue('OAUTH_42_CLIENT_SECRET', '42_client_secret');
        const redirectUri = resolveConfigValue('OAUTH_42_REDIRECT_URI', '42_redirect_uri');

        this.config = {
            clientId: clientId ?? '',
            clientSecret: clientSecret ?? '',
            redirectUri: redirectUri ?? '',
            authorizeUrl: resolveConfigValue(
                'OAUTH_42_AUTHORIZE_URL',
                '42_authorize_url',
                'https://api.intra.42.fr/oauth/authorize'
            ) ?? '',
            tokenUrl: resolveConfigValue(
                'OAUTH_42_TOKEN_URL',
                '42_token_url',
                'https://api.intra.42.fr/oauth/token'
            ) ?? '',
            profileUrl: resolveConfigValue(
                'OAUTH_42_PROFILE_URL',
                '42_profile_url',
                'https://api.intra.42.fr/v2/me'
            ) ?? '',
            scope: resolveConfigValue('OAUTH_42_SCOPE', '42_scope', 'public') ?? '',
        };
        this.initialized = true;
        this.enabled = Boolean(clientId && clientSecret && redirectUri);

        if (!this.enabled) {
            console.warn(
                '[OAuth42Service] OAuth 42 is disabled. Set 42_client_id/42_client_secret/42_redirect_uri in Vault.'
            );
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
            console.error('[OAuth42Service] Token exchange failed:', { status: tokenResponse.status, body });
            throw new Error('Failed to exchange OAuth code for token');
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
            console.error('[OAuth42Service] Profile fetch failed:', { status: profileResponse.status, body });
            throw new Error('Failed to fetch user profile from OAuth provider');
        }

        const profile = await profileResponse.json() as OAuth42Profile;
        return profile;
    }

    private ensureInitialized(): void {
        if (!this.initialized) {
            throw new Error('OAuth42Service not initialized');
        }
        if (!this.enabled) {
            throw new Error('OAuth42Service not configured');
        }
    }
}

export const createOAuth42Service = () => new OAuth42Service();
