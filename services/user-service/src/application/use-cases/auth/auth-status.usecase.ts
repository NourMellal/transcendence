import { UserRepository } from '../../../domain/ports';

export class AuthStatusUseCase {
    constructor(private userRepository: UserRepository) { }

    async execute(userId: string): Promise<{
        authenticated: boolean;
        user?: {
            id: string;
            email: string;
            username: string;
            displayName?: string;
            avatar?: string;
            is2FAEnabled: boolean;
            oauthProvider?: string;
        };
    }> {
        if (!userId) {
            return { authenticated: false };
        }

        const user = await this.userRepository.findById(userId);

        if (!user) {
            return { authenticated: false };
        }

        return {
            authenticated: true,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                displayName: user.displayName,
                avatar: user.avatar,
                is2FAEnabled: user.is2FAEnabled,
                oauthProvider: user.oauthProvider,
            }
        };
    }
}
