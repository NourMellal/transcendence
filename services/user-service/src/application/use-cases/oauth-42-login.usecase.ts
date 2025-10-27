import { OAuth42LoginUseCase, OAuthService } from '../../domain/ports';
import { randomBytes } from 'crypto';

export class OAuth42LoginUseCaseImpl implements OAuth42LoginUseCase {
    constructor(
        private readonly oauthService: OAuthService
    ) {}

    /**
     * Generate OAuth 42 authorization URL
     */
    async execute(): Promise<string> {
        // Generate a secure state parameter for CSRF protection
        const state = randomBytes(16).toString('hex');
        
        // Store state in session/cache for validation (you might want to implement this)
        // For now, we'll include it in the URL and validate it in callback
        
        return this.oauthService.getAuthorizationUrl(state);
    }
}
