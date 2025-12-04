import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { createUser } from '../../../domain/entities/user.entity';
import { PresenceStatus } from '../../../domain/entities/presence.entity';
import type {
    IOAuth42CallbackUseCase,
    OAuthService,
    UserRepository,
    SessionRepository,
    UserPresenceRepository
} from '../../../domain/ports';
import { OAuthStateManager } from '../../services/oauth-state.manager';
import type { JWTConfig } from '@transcendence/shared-utils';
import { DisplayName, Email, UserId, Username } from '../../../domain/value-objects';
import type { OAuthCallbackRequestDTO, OAuthCallbackResponseDTO } from '../../dto/auth.dto';

export interface JWTProvider {
    getJWTConfig(): Promise<JWTConfig>;
}

export class OAuth42CallbackUseCaseImpl implements IOAuth42CallbackUseCase {
    constructor(
        private readonly oauthService: OAuthService,
        private readonly userRepository: UserRepository,
        private readonly sessionRepository: SessionRepository,
        private readonly jwtProvider: JWTProvider,
        private readonly stateManager: OAuthStateManager,
        private readonly presenceRepository?: UserPresenceRepository
    ) { }

    async execute(input: OAuthCallbackRequestDTO): Promise<OAuthCallbackResponseDTO> {
        const { code, state } = input;
        const stateValid = this.stateManager.consumeState(state);
        if (!stateValid) {
            throw new Error('Invalid OAuth state');
        }

        const profile = await this.oauthService.exchangeCodeForProfile(code);
        const email = new Email(profile.email);
        let user = await this.userRepository.findByEmail(email.toString());

        if (!user) {
            user = await this.userRepository.findByUsername(profile.login);
        }

        if (!user) {
            const username = await this.generateUniqueUsername(profile.login);
            const usernameVO = new Username(username);
            const displayName = this.buildDisplayName(profile.first_name, profile.last_name, profile.login);
            const newUser = createUser({
                id: new UserId(crypto.randomUUID()),
                email,
                username: usernameVO,
                displayName,
                oauthProvider: '42',
                oauthId: profile.id.toString(),
            });
            newUser.avatar = profile.image?.link;
            newUser.passwordHash = undefined;
            await this.userRepository.save(newUser);
            user = newUser;
        } else {
            // Update existing user with latest profile data
            await this.userRepository.update(user.id.toString(), {
                displayName: this.buildDisplayName(profile.first_name, profile.last_name, user.username.toString()),
                avatar: profile.image?.link || user.avatar,
                oauthProvider: '42',
                oauthId: profile.id.toString(),
            });
            user = (await this.userRepository.findById(user.id.toString()))!;
        }

        const jwtConfig = await this.jwtProvider.getJWTConfig();
        const accessToken = jwt.sign(
            {
                sub: user.id.toString(),
                userId: user.id.toString(),
                email: user.email.toString(),
                username: user.username.toString(),
            },
            jwtConfig.secretKey,
            {
                expiresIn: `${jwtConfig.expirationHours}h`,
                issuer: jwtConfig.issuer,
            }
        );

        const refreshToken = await this.createRefreshSession(user.id.toString());

        // Set user presence to ONLINE after successful OAuth login
        await this.presenceRepository?.upsert(user.id.toString(), PresenceStatus.ONLINE, new Date());

        return {
            sessionToken: accessToken,
            userId: user.id.toString(),
            refreshToken,
        };
    }

    private async generateUniqueUsername(baseLogin: string): Promise<string> {
        const sanitized = baseLogin
            .toLowerCase()
            .replace(/[^a-z0-9_-]/gi, '')
            .slice(0, 20) || 'user';

        let attempt = sanitized;
        let suffix = 1;

        // Guarantee uniqueness by checking repository
        while (await this.userRepository.findByUsername(attempt)) {
            attempt = `${sanitized}${suffix}`;
            suffix += 1;
        }

        return attempt;
    }

    private buildDisplayName(firstName: string, lastName: string, fallback: string): DisplayName {
        const combined = `${firstName ?? ''} ${lastName ?? ''}`.trim();
        const value = combined || fallback;
        return new DisplayName(value);
    }

    private async createRefreshSession(userId: string): Promise<string> {
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

        return refreshToken;
    }
}
