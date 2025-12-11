import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../../../domain/entities/user.entity';
import { SessionRepository, UserRepository } from '../../../domain/ports';
import type { IRefreshTokenUseCase } from '../../../domain/ports';
import type { JWTService } from './login.usecase';
import type { RefreshTokenRequestDTO, RefreshTokenResponseDTO } from '../../dto/auth.dto';
import { AuthMapper } from '../../mappers/auth.mapper';

export class RefreshTokenUseCase implements IRefreshTokenUseCase {
    constructor(
        private readonly sessionRepository: SessionRepository,
        private readonly userRepository: UserRepository,
        private readonly jwtService: JWTService
    ) {}

    async execute(input: RefreshTokenRequestDTO): Promise<RefreshTokenResponseDTO> {
        const { refreshToken } = input;
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
        const { refreshToken: newRefreshToken } = await this.createRefreshSession(user.id.toString());

        const sanitizedUser: User = { ...user, passwordHash: undefined };
        return AuthMapper.toLoginResponseDTO(sanitizedUser, accessToken, newRefreshToken, 'Token refreshed');
    }

    private async generateToken(user: User): Promise<string> {
        const config = await this.jwtService.getJWTConfig();

        if (!config || !config.secretKey) {
            throw new Error('JWT configuration is not available');
        }

        const payload = {
            sub: user.id.toString(),
            userId: user.id.toString(),
            email: user.email.toString(),
            username: user.username.toString(),
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
