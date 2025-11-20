import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RefreshTokenUseCase } from '../../../../../src/application/use-cases/auth/refresh-token.usecase';
import {
    createMockSessionRepository,
    createMockUserRepository
} from '../../../../helpers/mock-repositories';
import { createMockJWTService } from '../../../../helpers/mock-services';
import { createTestUser } from '../../../../helpers/entity-factories';
import { UserId } from '../../../../../src/domain/value-objects';
import type { JWTService } from '../../../../../src/application/use-cases/auth/login.usecase';

describe('RefreshTokenUseCase', () => {
    let sessionRepository: ReturnType<typeof createMockSessionRepository>;
    let userRepository: ReturnType<typeof createMockUserRepository>;
    let jwtService: JWTService;

    const factory = () => new RefreshTokenUseCase(sessionRepository, userRepository, jwtService);

    beforeEach(() => {
        sessionRepository = createMockSessionRepository();
        userRepository = createMockUserRepository();
        jwtService = createMockJWTService() as JWTService;
    });

    it('renews refresh token when session is valid', async () => {
        const user = createTestUser({ id: new UserId('user-1'), passwordHash: 'hash' });
        sessionRepository.findByToken.mockResolvedValue({
            id: 'session-1',
            userId: user.id.toString(),
            token: 'old',
            expiresAt: new Date(Date.now() + 60_000),
            createdAt: new Date(),
        });
        userRepository.findById.mockResolvedValue(user);
        jwtService.getJWTConfig.mockResolvedValue({
            secretKey: 'secret',
            expirationHours: 1,
            issuer: 'test-suite',
        });

        const result = await factory().execute({ refreshToken: 'old' });

        expect(sessionRepository.delete).toHaveBeenCalledWith('old');
        expect(sessionRepository.save).toHaveBeenCalledTimes(1);
        expect(result.message).toBe('Token refreshed');
        expect(result.refreshToken).toBeTypeOf('string');
    });

    it('throws when session is missing', async () => {
        sessionRepository.findByToken.mockResolvedValue(null);

        await expect(factory().execute({ refreshToken: 'invalid' }))
            .rejects
            .toThrow('Invalid refresh token');
    });
});
