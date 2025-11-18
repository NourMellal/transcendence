import jwt from 'jsonwebtoken';
import { User, PasswordHelper } from '../../../domain/entities/user.entity';
import { UserRepository, TwoFAService, SessionRepository, UserPresenceRepository } from '../../../domain/ports';
import { PresenceStatus } from '../../../domain/entities/presence.entity';
import type { JWTConfig } from '@transcendence/shared-utils';
import { LoginUseCaseInput, LoginUseCaseOutput } from '../../dto/auth.dto';
import crypto from 'crypto';

export interface JWTService {
    getJWTConfig(): Promise<JWTConfig>;
}

export class LoginUseCase {
    constructor(
        private userRepository: UserRepository,
        private jwtService: JWTService,
        private sessionRepository: SessionRepository,
        private twoFAService?: TwoFAService,
        private presenceRepository?: UserPresenceRepository
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

        // Generate JWT and refresh token
        const accessToken = await this.generateToken(user);
        const { refreshToken } = await this.createRefreshSession(user.id);
        await this.presenceRepository?.upsert(user.id, PresenceStatus.ONLINE, new Date());

        // Return user without password hash
        const { passwordHash: _, ...userWithoutPassword } = user;

        return {
            user: userWithoutPassword as User,
            accessToken,
            refreshToken,
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

    private async createRefreshSession(userId: string): Promise<{ refreshToken: string; expiresAt: Date }> {
        const refreshToken = crypto.randomBytes(48).toString('hex');
        const ttlDays = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? '7');
        const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

        await this.sessionRepository.save({
            id: crypto.randomUUID(),
            userId,
            token: refreshToken,
            expiresAt,
            createdAt: new Date(),
        });

        return { refreshToken, expiresAt };
    }
}
