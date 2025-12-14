import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../../../domain/entities/user.entity';
import { UserRepository, TwoFAService, SessionRepository, UserPresenceRepository, IPasswordHasher } from '../../../domain/ports';
import type { ILoginUseCase } from '../../../domain/ports';
import { PresenceStatus } from '../../../domain/entities/presence.entity';
import type { JWTConfig } from '@transcendence/shared-utils';
import { REFRESH_TOKEN_BYTES, MS_PER_DAY } from '@transcendence/shared-utils';
import type { LoginUseCaseInputDTO, LoginUseCaseOutputDTO } from '../../dto/auth.dto';
import { Email } from '../../../domain/value-objects';
import { AuthMapper } from '../../mappers/auth.mapper';

const DEFAULT_PRESENCE_STALE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

function resolvePresenceStaleThreshold(): number {
    const raw = Number(process.env.PRESENCE_STALE_THRESHOLD_MS);
    if (Number.isFinite(raw) && raw > 0) {
        return raw;
    }
    return DEFAULT_PRESENCE_STALE_THRESHOLD_MS;
}

export interface JWTService {
    getJWTConfig(): Promise<JWTConfig>;
}

export class LoginUseCase implements ILoginUseCase {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly jwtService: JWTService,
        private readonly sessionRepository: SessionRepository,
        private readonly passwordHasher: IPasswordHasher,
        private readonly twoFAService?: TwoFAService,
        private readonly presenceRepository?: UserPresenceRepository
    ) { }

    async execute(input: LoginUseCaseInputDTO): Promise<LoginUseCaseOutputDTO> {
        // Validate input
        if (!input.email || !input.password) {
            throw new Error('Email and password are required');
        }

        const email = new Email(input.email);
        const user = await this.userRepository.findByEmail(email.toString());
        if (!user) {
            throw new Error('Invalid credentials');
        }

        // Check if user has a password (local auth)
        if (!user.passwordHash) {
            throw new Error('This account uses OAuth authentication');
        }

        // Verify password
        const isPasswordValid = await this.passwordHasher.verify(input.password, user.passwordHash);
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

        await this.ensureNoActiveSessions(user.id.toString());

        // Generate JWT and refresh token
        const accessToken = await this.generateToken(user);
        const { refreshToken } = await this.createRefreshSession(user.id.toString());
        await this.presenceRepository?.upsert(user.id.toString(), PresenceStatus.ONLINE, new Date());

        // Explicitly pick only safe fields to prevent leaking sensitive data
        const sanitizedUser: User = {
            id: user.id,
            email: user.email,
            username: user.username,
            displayName: user.displayName,
            avatar: user.avatar,
            is2FAEnabled: user.is2FAEnabled,
            oauthProvider: user.oauthProvider,
            oauthId: user.oauthId,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            passwordHash: undefined,
            twoFASecret: undefined,
        };
        return AuthMapper.toLoginResponseDTO(sanitizedUser, accessToken, refreshToken);
    }

    private async generateToken(user: User): Promise<string> {
        const config = await this.jwtService.getJWTConfig();

        // Validate config
        if (!config || !config.secretKey) {
            throw new Error('JWT configuration is not available');
        }

        const payload = {
            sub: user.id.toString(),
            userId: user.id.toString(),
            email: user.email.toString(),
            username: user.username.toString(),
        };

        // Use jsonwebtoken library (same as API Gateway)
        return jwt.sign(payload, config.secretKey, {
            expiresIn: `${config.expirationHours}h`,
            issuer: config.issuer,
        });
    }

    private async createRefreshSession(userId: string): Promise<{ refreshToken: string; expiresAt: Date }> {
        const refreshToken = crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
        const ttlDays = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? '7');
        const expiresAt = new Date(Date.now() + ttlDays * MS_PER_DAY);

        await this.sessionRepository.save({
            id: crypto.randomUUID(),
            userId,
            token: refreshToken,
            expiresAt,
            createdAt: new Date(),
        });

        return { refreshToken, expiresAt };
    }

    private async ensureNoActiveSessions(userId: string): Promise<void> {
        const sessions = await this.sessionRepository.findByUserId(userId);
        const now = Date.now();
        const activeSessions = sessions.filter((session) => session.expiresAt.getTime() > now);

        if (!activeSessions.length) {
            return;
        }

        const shouldForceLogout = await this.shouldForceLogout(userId, now);
        if (shouldForceLogout) {
            await this.sessionRepository.deleteAllForUser(userId);
            return;
        }

        throw new Error('User already logged in from another device');
    }

    private async shouldForceLogout(userId: string, now: number): Promise<boolean> {
        if (!this.presenceRepository) {
            return false;
        }

        const presence = await this.presenceRepository.findByUserId(userId);
        if (!presence) {
            return true;
        }

        if (presence.status === PresenceStatus.OFFLINE) {
            return true;
        }

        const lastSeen = presence.lastSeenAt.getTime();
        const thresholdMs = resolvePresenceStaleThreshold();
        const isStale = now - lastSeen > thresholdMs;

        if (isStale) {
            await this.presenceRepository.markOffline(userId, new Date(now));
            return true;
        }

        return false;
    }
}
