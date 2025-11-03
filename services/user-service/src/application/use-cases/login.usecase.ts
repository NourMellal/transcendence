import jwt from 'jsonwebtoken';
import { User, PasswordHelper } from '../../domain/entities/user.entity.js';
import { UserRepository } from '../../domain/ports.js';
import type { JWTConfig } from '@transcendence/shared-utils';
import { LoginUseCaseInput, LoginUseCaseOutput } from '../dto/auth.dto.js';

export interface JWTService {
    getJWTConfig(): Promise<JWTConfig>;
}

export class LoginUseCase {
    constructor(
        private userRepository: UserRepository,
        private jwtService: JWTService
    ) { }

    async execute(input: LoginUseCaseInput): Promise<LoginUseCaseOutput> {
        // Validate input
        if (!input.email || !input.password) {
            throw new Error('Email and password are required');
        }

        // Find user by email
        const user = await this.userRepository.findByEmail(input.email);
        if (!user) {
            throw new Error('Invalid credentials');
        }

        // Check if user has a password (local auth)
        if (!user.passwordHash) {
            throw new Error('This account uses OAuth authentication');
        }

        // Verify password
        const isPasswordValid = await PasswordHelper.verify(input.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new Error('Invalid credentials');
        }

        // Generate JWT token using Vault secrets
        const accessToken = await this.generateToken(user);

        // Return user without password hash
        const { passwordHash: _, ...userWithoutPassword } = user;

        return {
            user: userWithoutPassword as User,
            accessToken,
        };
    }

    private async generateToken(user: User): Promise<string> {
        const config = await this.jwtService.getJWTConfig();

        // Validate config
        if (!config || !config.secretKey) {
            throw new Error('JWT configuration is not available');
        }

        const payload = {
            sub: user.id,
            userId: user.id,
            email: user.email,
            username: user.username,
        };

        // Use jsonwebtoken library (same as API Gateway)
        return jwt.sign(payload, config.secretKey, {
            expiresIn: `${config.expirationHours}h`,
            issuer: config.issuer,
        });
    }
}
