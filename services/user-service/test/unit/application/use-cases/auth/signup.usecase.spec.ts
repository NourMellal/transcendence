import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SignupUseCase } from '../../../../../src/application/use-cases/auth/signup.usecase';
import { createMockUserRepository } from '../../../../helpers/mock-repositories';
import { createMockPasswordHasher } from '../../../../helpers/mock-services';
import { createTestUser } from '../../../../helpers/entity-factories';

describe('SignupUseCase', () => {
    const input = {
        email: 'player@example.com',
        username: 'player_one',
        password: 'Abcdef1!',
        displayName: 'Player One',
    };

    let userRepository: ReturnType<typeof createMockUserRepository>;
    let passwordHasher: ReturnType<typeof createMockPasswordHasher>;
    const factory = () => new SignupUseCase(userRepository, passwordHasher);

    beforeEach(() => {
        userRepository = createMockUserRepository();
        passwordHasher = createMockPasswordHasher();
    });

    it('registers a new local user and returns DTO output', async () => {
        userRepository.findByEmail.mockResolvedValue(null);
        userRepository.findByUsername.mockResolvedValue(null);
        passwordHasher.hash.mockResolvedValue('hashed-password');

        const useCase = factory();
        const result = await useCase.execute(input);

        expect(passwordHasher.hash).toHaveBeenCalledWith(input.password);
        expect(userRepository.save).toHaveBeenCalledTimes(1);
        expect(result).toMatchObject({
            email: input.email,
            username: input.username,
            displayName: input.displayName,
            is2FAEnabled: false,
        });
    });

    it('throws when email already exists', async () => {
        userRepository.findByEmail.mockResolvedValue(createTestUser());

        const useCase = factory();
        await expect(useCase.execute(input)).rejects.toThrow('Email already exists');
    });
});
