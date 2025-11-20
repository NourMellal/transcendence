import type { LoginUseCaseInputDTO, SignupUseCaseInputDTO } from '../../src/application/dto/auth.dto';
import type { UpdateProfileInputDTO, UpdateProfileRequestDTO } from '../../src/application/dto/user.dto';

export const createSignupInputDTO = (overrides: Partial<SignupUseCaseInputDTO> = {}): SignupUseCaseInputDTO => ({
    email: 'player@example.com',
    username: 'player_one',
    password: 'Abcdef1!',
    displayName: 'Player One',
    ...overrides,
});

export const createLoginInputDTO = (overrides: Partial<LoginUseCaseInputDTO> = {}): LoginUseCaseInputDTO => ({
    email: 'player@example.com',
    password: 'Abcdef1!',
    ...overrides,
});

export const createUpdateProfilePayload = (
    overrides: Partial<UpdateProfileRequestDTO> = {}
): UpdateProfileRequestDTO => ({
    displayName: 'Player One',
    email: 'player@example.com',
    username: 'player_one',
    avatar: 'avatar.png',
    password: 'Abcdef1!',
    ...overrides,
});

export const createUpdateProfileInputDTO = (
    overrides: Partial<UpdateProfileInputDTO> = {}
): UpdateProfileInputDTO => ({
    userId: 'user-1',
    displayName: 'Player One',
    ...overrides,
});
