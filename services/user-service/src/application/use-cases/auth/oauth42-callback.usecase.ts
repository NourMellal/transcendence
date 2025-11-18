import jwt from 'jsonwebtoken';
import { createUser } from '../../../domain/entities/user.entity';
import type {
    OAuth42CallbackUseCase,
    OAuthService,
    UserRepository
} from '../../../domain/ports';
import type { User } from '../../../domain/entities/user.entity';
import { OAuthStateManager } from '../../services/oauth-state.manager';
import type { JWTConfig } from '@transcendence/shared-utils';

export interface JWTProvider {
    getJWTConfig(): Promise<JWTConfig>;
}

export class OAuth42CallbackUseCaseImpl implements OAuth42CallbackUseCase {
    constructor(
        private readonly oauthService: OAuthService,
        private readonly userRepository: UserRepository,
        private readonly jwtProvider: JWTProvider,
        private readonly stateManager: OAuthStateManager
    ) { }

    async execute(code: string, state: string): Promise<{ user: User; sessionToken: string; }> {
        const stateValid = this.stateManager.consumeState(state);
        if (!stateValid) {
            throw new Error('Invalid OAuth state');
        }

        const profile = await this.oauthService.exchangeCodeForProfile(code);
        let user = await this.userRepository.findByEmail(profile.email);

        if (!user) {
            user = await this.userRepository.findByUsername(profile.login);
        }

        if (!user) {
            const username = await this.generateUniqueUsername(profile.login);
            const newUser = createUser({
                email: profile.email,
                username,
                displayName: `${profile.first_name} ${profile.last_name}`.trim() || profile.login,
                oauthProvider: '42',
                oauthId: profile.id.toString(),
            });
            newUser.avatar = profile.image?.link;
            newUser.passwordHash = undefined;
            await this.userRepository.save(newUser);
            user = newUser;
        } else {
            // Update existing user with latest profile data
            await this.userRepository.update(user.id, {
                displayName: `${profile.first_name} ${profile.last_name}`.trim() || user.displayName,
                avatar: profile.image?.link || user.avatar,
                oauthProvider: '42',
                oauthId: profile.id.toString(),
            });
            user = (await this.userRepository.findById(user.id))!;
        }

        const jwtConfig = await this.jwtProvider.getJWTConfig();
        const accessToken = jwt.sign(
            {
                sub: user.id,
                userId: user.id,
                email: user.email,
                username: user.username,
            },
            jwtConfig.secretKey,
            {
                expiresIn: `${jwtConfig.expirationHours}h`,
                issuer: jwtConfig.issuer,
            }
        );

        return {
            sessionToken: accessToken,
            user,
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
}
