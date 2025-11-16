import { User, createUser, PasswordHelper } from '../../../domain/entities/user.entity.js';
import { UserRepository } from '../../../domain/ports.js';
import { SignupUseCaseInput } from '../../dto/auth.dto.js';
export class SignupUseCase {
    constructor(
        private userRepository: UserRepository
    ) { }

    async execute(input: SignupUseCaseInput): Promise<User> {
        // Validate input
        if (!input.email || !input.username || !input.password) {
            throw new Error('Email, username, and password are required');
        }

        // Check email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(input.email)) {
            throw new Error('Invalid email format');
        }

        // Check username format
        const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
        if (!usernameRegex.test(input.username)) {
            throw new Error('Username must be 3-20 characters, alphanumeric, underscore, or hyphen');
        }

        // Check password length
        if (input.password.length < 8) {
            throw new Error('Password must be at least 8 characters');
        }

        // Check if email already exists
        const existingUserByEmail = await this.userRepository.findByEmail(input.email);
        if (existingUserByEmail) {
            throw new Error('Email already exists');
        }

        // Check if username already exists
        const existingUserByUsername = await this.userRepository.findByUsername(input.username);
        if (existingUserByUsername) {
            throw new Error('Username already exists');
        }

        // Hash password
        const passwordHash = await PasswordHelper.hash(input.password);

        // Create user
        const user = createUser({
            email: input.email,
            username: input.username,
            passwordHash,
            displayName: input.displayName,
            oauthProvider: 'local',
        });

        // Save user
        await this.userRepository.save(user);

        // Return user without password hash
        const { passwordHash: _, ...userWithoutPassword } = user;
        return userWithoutPassword as User;
    }
}
