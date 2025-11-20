import { describe, expect, it, beforeEach } from 'vitest';
import { GetUserUseCase } from '../../../../../src/application/use-cases/users/get-user.usecase';
import { createMockUserRepository } from '../../../../helpers/mock-repositories';
import { createTestUser } from '../../../../helpers/entity-factories';
import { UserId } from '../../../../../src/domain/value-objects';

describe('GetUserUseCase', () => {
    let userRepository: ReturnType<typeof createMockUserRepository>;
    const factory = () => new GetUserUseCase(userRepository);

    beforeEach(() => {
        userRepository = createMockUserRepository();
    });

    it('returns user profile DTO when found', async () => {
        const user = createTestUser({ id: new UserId('user-1') });
        userRepository.findById.mockResolvedValue(user);

        const useCase = factory();
        const result = await useCase.execute({ userId: 'user-1' });

        expect(result).toMatchObject({
            id: 'user-1',
            email: user.email.toString(),
            username: user.username.toString(),
            displayName: user.displayName.toString(),
        });
    });

    it('returns null when user does not exist', async () => {
        userRepository.findById.mockResolvedValue(null);
        const useCase = factory();

        const result = await useCase.execute({ userId: 'missing' });
        expect(result).toBeNull();
    });
});
