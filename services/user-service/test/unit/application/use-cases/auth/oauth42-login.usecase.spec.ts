import { describe, expect, it, vi } from 'vitest';
import { OAuth42LoginUseCaseImpl } from '../../../../../src/application/use-cases/auth/oauth42-login.usecase';
import type { OAuthStateManager } from '../../../../../src/application/services/oauth-state.manager';
import type { OAuthService } from '../../../../../src/domain/ports';

describe('OAuth42LoginUseCase', () => {
    it('generates authorization URL with state token', async () => {
        const oauthService: OAuthService = {
            getAuthorizationUrl: vi.fn().mockReturnValue('https://example.com/oauth'),
            exchangeCodeForProfile: vi.fn(),
        };
        const stateManager = {
            createState: vi.fn().mockReturnValue('state-123'),
        } as unknown as OAuthStateManager;

        const useCase = new OAuth42LoginUseCaseImpl(oauthService, stateManager);
        const result = await useCase.execute();

        expect(stateManager.createState).toHaveBeenCalled();
        expect(oauthService.getAuthorizationUrl).toHaveBeenCalledWith('state-123');
        expect(result.authorizationUrl).toBe('https://example.com/oauth');
    });
});
