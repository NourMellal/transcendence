import { beforeEach, describe, expect, it } from 'vitest';
import { UpdateProfileUseCase } from '../../../../../src/application/use-cases/users/update-profile.usecase';
import { createMockUserRepository } from '../../../../helpers/mock-repositories';
import { createMockPasswordHasher } from '../../../../helpers/mock-services';
import { createTestUser } from '../../../../helpers/entity-factories';
import { DisplayName, Email, Username, UserId } from '../../../../../src/domain/value-objects';

describe('UpdateProfileUseCase', () => {
    let userRepository: ReturnType<typeof createMockUserRepository>;
    let passwordHasher: ReturnType<typeof createMockPasswordHasher>;
    const factory = () => new UpdateProfileUseCase(userRepository, passwordHasher);

    beforeEach(() => {
        userRepository = createMockUserRepository();
        passwordHasher = createMockPasswordHasher();
    });

    it('updates profile fields and returns DTO', async () => {
        const existingUser = createTestUser({ id: new UserId('user-1'), oauthProvider: 'local' });
        const persistedUser = createTestUser({
            id: new UserId('user-1'),
            email: new Email('new@example.com'),
            username: new Username('new_name'),
            displayName: new DisplayName('New Display'),
            oauthProvider: 'local',
        });

        userRepository.findById.mockResolvedValueOnce(existingUser).mockResolvedValueOnce(persistedUser);
        userRepository.findByEmail.mockResolvedValue(null);
        userRepository.findByUsername.mockResolvedValue(null);
        passwordHasher.hash.mockResolvedValue('new-hash');

        const useCase = factory();
        const result = await useCase.execute({
            userId: 'user-1',
            email: 'new@example.com',
            username: 'new_name',
            displayName: 'New Display',
            password: 'Abcdef1!',
        });

        expect(passwordHasher.hash).toHaveBeenCalledWith('Abcdef1!');
        expect(userRepository.update).toHaveBeenCalledWith(
            'user-1',
            expect.objectContaining({
                email: expect.any(Email),
                username: expect.any(Username),
                displayName: expect.any(DisplayName),
                passwordHash: 'new-hash',
            })
        );
        expect(result).toMatchObject({
            id: 'user-1',
            email: 'new@example.com',
            username: 'new_name',
            displayName: 'New Display',
        });
    });

    it('throws when user not found', async () => {
        userRepository.findById.mockResolvedValue(null);
        const useCase = factory();

        await expect(useCase.execute({ userId: 'missing' })).rejects.toThrow('User not found');
    });
});
