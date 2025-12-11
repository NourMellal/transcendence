import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OAuth42CallbackUseCaseImpl, type JWTProvider } from '../../../../../src/application/use-cases/auth/oauth42-callback.usecase';
import { createMockUserRepository } from '../../../../helpers/mock-repositories';
import { createTestUser } from '../../../../helpers/entity-factories';
import { UserId } from '../../../../../src/domain/value-objects';

const mockProfile = {
    id: 42,
    email: 'oauth@example.com',
    login: 'oauth-user',
    first_name: 'OAuth',
    last_name: 'User',
    image: { link: 'avatar.png' },
};

describe('OAuth42CallbackUseCase', () => {
    let userRepository: ReturnType<typeof createMockUserRepository>;
    const oauthService = {
        exchangeCodeForProfile: vi.fn(),
        getAuthorizationUrl: vi.fn(),
    };
    const jwtProvider: JWTProvider = {
        getJWTConfig: vi.fn(),
    };
    const stateManager = {
        consumeState: vi.fn(),
    };

    const factory = () =>
        new OAuth42CallbackUseCaseImpl(
            oauthService,
            userRepository,
            jwtProvider,
            stateManager as any
        );

    beforeEach(() => {
        userRepository = createMockUserRepository();
        vi.clearAllMocks();
        stateManager.consumeState.mockReturnValue(true);
        oauthService.exchangeCodeForProfile.mockResolvedValue(mockProfile);
        jwtProvider.getJWTConfig.mockResolvedValue({
            secretKey: 'secret',
            expirationHours: 1,
            issuer: 'test-suite',
        });
    });

    it('creates new user when none exists', async () => {
        userRepository.findByEmail.mockResolvedValue(null);
        userRepository.findByUsername.mockResolvedValue(null);

        const { sessionToken, userId } = await factory().execute({
            code: 'code',
            state: 'state',
        });

        expect(userRepository.save).toHaveBeenCalledTimes(1);
        expect(sessionToken).toBeTypeOf('string');
        expect(userId).toBeDefined();
    });

    it('updates existing user profile data', async () => {
        const user = createTestUser({ id: new UserId('user-1') });
        userRepository.findByEmail.mockResolvedValue(user);
        userRepository.findById.mockResolvedValue(user);

        const result = await factory().execute({ code: 'code', state: 'state' });

        expect(userRepository.update).toHaveBeenCalledWith(
            user.id.toString(),
            expect.objectContaining({ oauthProvider: '42' })
        );
        expect(result.userId).toBe('user-1');
    });

    it('throws if OAuth state invalid', async () => {
        stateManager.consumeState.mockReturnValue(false);
        await expect(factory().execute({ code: 'code', state: 'bad' })).rejects.toThrow('Invalid OAuth state');
    });
});
