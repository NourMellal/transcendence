import { beforeEach, describe, expect, it } from 'vitest';
import { LogoutUseCase } from '../../../../../src/application/use-cases/auth/logout.usecase';
import {
    createMockSessionRepository,
    createMockUserRepository,
    createMockPresenceRepository
} from '../../../../helpers/mock-repositories';
import { createTestUser } from '../../../../helpers/entity-factories';
import { UserId } from '../../../../../src/domain/value-objects';

describe('LogoutUseCase', () => {
    let userRepository: ReturnType<typeof createMockUserRepository>;
    let sessionRepository: ReturnType<typeof createMockSessionRepository>;
    let presenceRepository: ReturnType<typeof createMockPresenceRepository>;
    const factory = () => new LogoutUseCase(userRepository, sessionRepository, presenceRepository);

    beforeEach(() => {
        userRepository = createMockUserRepository();
        sessionRepository = createMockSessionRepository();
        presenceRepository = createMockPresenceRepository();
    });

    it('removes sessions and marks user offline', async () => {
        const user = createTestUser({ id: new UserId('user-1') });
        userRepository.findById.mockResolvedValue(user);

        const result = await factory().execute({ userId: 'user-1', refreshToken: 'refresh-token' });

        expect(sessionRepository.delete).toHaveBeenCalledWith('refresh-token');
        expect(presenceRepository.markOffline).toHaveBeenCalledWith('user-1', expect.any(Date));
        expect(result).toEqual({ message: 'Logged out successfully' });
    });

    it('throws when user missing', async () => {
        userRepository.findById.mockResolvedValue(null);

        await expect(factory().execute({ userId: 'missing' })).rejects.toThrow('User not found');
    });
});
