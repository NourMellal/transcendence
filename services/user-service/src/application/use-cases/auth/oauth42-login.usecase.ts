import type { IOAuth42LoginUseCase } from '../../../domain/ports';
import type { OAuthService } from '../../../domain/ports';
import { OAuthStateManager } from '../../services/oauth-state.manager';
import type { OAuthLoginResponseDTO } from '../../dto/auth.dto';

export class OAuth42LoginUseCaseImpl implements IOAuth42LoginUseCase {
    constructor(
        private readonly oauthService: OAuthService,
        private readonly stateManager: OAuthStateManager
    ) { }

    async execute(): Promise<OAuthLoginResponseDTO> {
        const state = this.stateManager.createState();
        try {
            const authorizationUrl = this.oauthService.getAuthorizationUrl(state);
            return {
                authorizationUrl,
            };
        } catch (error) {
            // Clean up state if OAuth config is missing or invalid.
            this.stateManager.consumeState(state);
            throw error;
        }
    }
}
