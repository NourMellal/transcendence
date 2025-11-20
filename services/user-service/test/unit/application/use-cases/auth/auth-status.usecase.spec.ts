import { beforeEach, describe, expect, it } from 'vitest';
import { AuthStatusUseCase } from '../../../../../src/application/use-cases/auth/auth-status.usecase';
import { createMockUserRepository } from '../../../../helpers/mock-repositories';
import { createTestUser } from '../../../../helpers/entity-factories';
import { UserId } from '../../../../../src/domain/value-objects';

describe('AuthStatusUseCase', () => {
    let userRepository: ReturnType<typeof createMockUserRepository>;
    const factory = () => new AuthStatusUseCase(userRepository);

    beforeEach(() => {
        userRepository = createMockUserRepository();
    });

    it('returns authenticated true when user exists', async () => {
        const user = createTestUser({ id: new UserId('user-1') });
        userRepository.findById.mockResolvedValue(user);

        const result = await factory().execute({ userId: 'user-1' });

        expect(result.authenticated).toBe(true);
        expect(result.user).toMatchObject({
            id: 'user-1',
            email: user.email.toString(),
            username: user.username.toString(),
        });
    });

    it('returns false when user missing', async () => {
        userRepository.findById.mockResolvedValue(null);
        const result = await factory().execute({ userId: 'missing' });
        expect(result).toEqual({ authenticated: false });
    });
});
