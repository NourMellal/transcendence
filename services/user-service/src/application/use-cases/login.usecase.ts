import jwt from 'jsonwebtoken';
import { User, PasswordHelper } from '../../domain/entities/user.entity.js';
import { UserRepository, TwoFAService, SessionRepository } from '../../domain/ports.js';
import type { JWTConfig } from '@transcendence/shared-utils';
import { LoginUseCaseInput, LoginUseCaseOutput } from '../dto/auth.dto.js';
import crypto from 'crypto';

export interface JWTService {
    getJWTConfig(): Promise<JWTConfig>;
}

export class LoginUseCase {
    constructor(
        private userRepository: UserRepository,
        private jwtService: JWTService,
        private twoFAService?: TwoFAService,
        private sessionRepository?: SessionRepository
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

        if (user.is2FAEnabled) {
            if (!this.twoFAService) {
                throw new Error('2FA service unavailable');
            }
            if (!input.totpCode) {
                throw new Error('Two-factor authentication required');
            }
            if (!user.twoFASecret) {
                throw new Error('Two-factor authentication not configured');
            }
            const isTokenValid = this.twoFAService.verifyToken(user.twoFASecret, input.totpCode);
            if (!isTokenValid) {
                throw new Error('Invalid 2FA token');
            }
        }

        // Generate JWT token using Vault secrets
        const accessToken = await this.generateToken(user);

        await this.persistSession(user.id, accessToken);

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

    private async persistSession(userId: string, token: string): Promise<void> {
        if (!this.sessionRepository) {
            return;
        }
        const config = await this.jwtService.getJWTConfig();
        const ttlHours = Number(config.expirationHours ?? 0);
        const expiresAt = new Date(Date.now() + (ttlHours > 0 ? ttlHours : 1) * 60 * 60 * 1000);

        await this.sessionRepository.save({
            id: crypto.randomUUID(),
            userId,
            token,
            expiresAt,
            createdAt: new Date(),
        });
    }
}
