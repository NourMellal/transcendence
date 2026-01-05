import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginUseCase, type JWTService } from '../../../../../src/application/use-cases/auth/login.usecase';
import {
    createMockSessionRepository,
    createMockUserRepository,
    createMockPresenceRepository,
} from '../../../../helpers/mock-repositories';
import { createMockPasswordHasher, createMockJWTService } from '../../../../helpers/mock-services';
import { createTestUser } from '../../../../helpers/entity-factories';
import { UserId } from '../../../../../src/domain/value-objects';
import { PresenceStatus } from '../../../../../src/domain/entities/presence.entity';

describe('LoginUseCase', () => {
    let userRepository: ReturnType<typeof createMockUserRepository>;
    let sessionRepository: ReturnType<typeof createMockSessionRepository>;
    let presenceRepository: ReturnType<typeof createMockPresenceRepository>;
    let passwordHasher: ReturnType<typeof createMockPasswordHasher>;
    let jwtService: JWTService;

    const factory = () =>
        new LoginUseCase(
            userRepository,
            jwtService,
            sessionRepository,
            passwordHasher,
            undefined,
            presenceRepository
        );

    beforeEach(() => {
        userRepository = createMockUserRepository();
        sessionRepository = createMockSessionRepository();
        presenceRepository = createMockPresenceRepository();
        passwordHasher = createMockPasswordHasher();
        jwtService = createMockJWTService() as JWTService;
    });

    it('authenticates with valid credentials', async () => {
        const user = createTestUser({ id: new UserId('user-1'), passwordHash: 'stored-hash' });
        userRepository.findByEmail.mockResolvedValue(user);
        passwordHasher.verify.mockResolvedValue(true);
        jwtService.getJWTConfig.mockResolvedValue({
            secretKey: 'secret',
            expirationHours: 1,
            issuer: 'test-suite',
        });
        sessionRepository.save.mockResolvedValue();

        const useCase = factory();
        const result = await useCase.execute({
            email: 'user@example.com',
            password: 'Abcdef1!',
        });

        expect(result.user.email).toBe(user.email.toString());
        expect(result.accessToken).toBeTypeOf('string');
        expect(passwordHasher.verify).toHaveBeenCalledWith('Abcdef1!', 'stored-hash');
        expect(sessionRepository.save).toHaveBeenCalledOnce();
        expect(presenceRepository.upsert).toHaveBeenCalledWith(
            user.id.toString(),
            PresenceStatus.ONLINE,
            expect.any(Date)
        );
    });

    it('throws when credentials are invalid', async () => {
        const user = createTestUser({ id: new UserId('user-2'), passwordHash: 'stored-hash' });
        userRepository.findByEmail.mockResolvedValue(user);
        passwordHasher.verify.mockResolvedValue(false);

        const useCase = factory();
        await expect(
            useCase.execute({
                email: 'user@example.com',
                password: 'wrong',
            })
        ).rejects.toThrow('Invalid credentials');
    });

    // Multiple active sessions are allowed (no single-session restriction).
});
