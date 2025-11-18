import type { OAuth42LoginUseCase, OAuthService } from '../../../domain/ports';
import { OAuthStateManager } from '../../services/oauth-state.manager';

export class OAuth42LoginUseCaseImpl implements OAuth42LoginUseCase {
    constructor(
        private readonly oauthService: OAuthService,
        private readonly stateManager: OAuthStateManager
    ) { }

    async execute(): Promise<string> {
        const state = this.stateManager.createState();
        return this.oauthService.getAuthorizationUrl(state);
    }
}
