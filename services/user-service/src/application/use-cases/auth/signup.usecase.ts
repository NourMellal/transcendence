import crypto from 'crypto';
import { createUser } from '../../../domain/entities/user.entity';
import { UserRepository, IPasswordHasher } from '../../../domain/ports';
import type { ISignupUseCase } from '../../../domain/ports';
import type { SignupUseCaseInputDTO, SignupResponseDTO } from '../../dto/auth.dto';
import { DisplayName, Email, Password, UserId, Username } from '../../../domain/value-objects';
import { AuthMapper } from '../../mappers/auth.mapper';

export class SignupUseCase implements ISignupUseCase {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly passwordHasher: IPasswordHasher
    ) { }

    async execute(input: SignupUseCaseInputDTO): Promise<SignupResponseDTO> {
        if (!input.email || !input.username || !input.password) {
            throw new Error('Email, username, and password are required');
        }

        const email = new Email(input.email);
        const username = new Username(input.username);
        const password = new Password(input.password);
        const displayName = input.displayName ? new DisplayName(input.displayName) : undefined;

        const existingUserByEmail = await this.userRepository.findByEmail(email.toString());
        if (existingUserByEmail) {
            throw new Error('Email already exists');
        }

        const existingUserByUsername = await this.userRepository.findByUsername(username.toString());
        if (existingUserByUsername) {
            throw new Error('Username already exists');
        }

        const passwordHash = await this.passwordHasher.hash(password.toString());

        const user = createUser({
            id: new UserId(crypto.randomUUID()),
            email,
            username,
            passwordHash,
            displayName,
            oauthProvider: 'local',
        });

        await this.userRepository.save(user);

        return AuthMapper.toSignupResponseDTO({ ...user, passwordHash: undefined });
    }
}
