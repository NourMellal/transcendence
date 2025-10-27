import { OAuth42CallbackUseCase, OAuthService, UserRepository } from '../../domain/ports';
import { User } from '../../domain/entities';
import { randomBytes } from 'crypto';
import { JWTService } from '../../adapters/external/jwt.service';

export class OAuth42CallbackUseCaseImpl implements OAuth42CallbackUseCase {
    constructor(
        private readonly oauthService: OAuthService,
        private readonly userRepository: UserRepository,
        private readonly jwtService: JWTService
    ) {}

    /**
     * Handle OAuth 42 callback and create/login user
     */
    async execute(code: string, state: string): Promise<{ user: User; sessionToken: string }> {
        try {
            // Step 1: Exchange code for profile
            const profile = await this.oauthService.exchangeCodeForProfile(code);

            // Step 2: Find or create user
            let user = await this.userRepository.findByEmail(profile.email);

            if (!user) {
                // Create new user from 42 profile
                const newUser: User = {
                    id: randomBytes(16).toString('hex'),
                    email: profile.email,
                    username: profile.login,
                    avatar: profile.image.link,
                    twoFASecret: undefined,
                    is2FAEnabled: false,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };

                await this.userRepository.save(newUser);
                user = newUser;
            } else {
                // Update existing user with latest profile info
                await this.userRepository.update(user.id, {
                    username: profile.login,
                    avatar: profile.image.link,
                    updatedAt: new Date()
                });

                // Refresh user object
                user = await this.userRepository.findById(user.id);
                if (!user) {
                    throw new Error('User not found after update');
                }
            }

            // Step 3: Generate JWT token
            const jwtToken = this.jwtService.generateToken({
                userId: user.id,
                email: user.email,
                username: user.username
            });

            return { user, sessionToken: jwtToken };

        } catch (error) {
            throw new Error(`OAuth callback failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
