import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../../../domain/entities/user.entity.js';
import { SessionRepository, UserRepository } from '../../../domain/ports.js';
import type { JWTService } from './login.usecase.js';
import type { LoginUseCaseOutput } from '../../dto/auth.dto.js';

export class RefreshTokenUseCase {
    constructor(
        private readonly sessionRepository: SessionRepository,
        private readonly userRepository: UserRepository,
        private readonly jwtService: JWTService
    ) {}

    async execute(refreshToken: string): Promise<LoginUseCaseOutput> {
        if (!refreshToken) {
            throw new Error('Refresh token is required');
        }

        const session = await this.sessionRepository.findByToken(refreshToken);

        if (!session) {
            throw new Error('Invalid refresh token');
        }

        if (session.expiresAt < new Date()) {
            await this.sessionRepository.delete(refreshToken);
            throw new Error('Refresh token expired');
        }

        const user = await this.userRepository.findById(session.userId);

        if (!user) {
            await this.sessionRepository.delete(refreshToken);
            throw new Error('User not found');
        }

        // Rotate refresh token
        await this.sessionRepository.delete(refreshToken);

        const accessToken = await this.generateToken(user);
        const { refreshToken: newRefreshToken } = await this.createRefreshSession(user.id);

        return {
            user,
            accessToken,
            refreshToken: newRefreshToken,
        };
    }

    private async generateToken(user: User): Promise<string> {
        const config = await this.jwtService.getJWTConfig();

        if (!config || !config.secretKey) {
            throw new Error('JWT configuration is not available');
        }

        const payload = {
            sub: user.id,
            userId: user.id,
            email: user.email,
            username: user.username,
        };

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
