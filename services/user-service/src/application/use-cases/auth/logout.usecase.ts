import { UserRepository, SessionRepository, UserPresenceRepository } from '../../../domain/ports';
import type { ILogoutUseCase } from '../../../domain/ports';
import type { LogoutInputDTO, LogoutResponseDTO } from '../../dto/auth.dto';

/**
 * Logout Use Case
 * 
 * Note: Since we're using stateless JWT tokens, we don't have server-side sessions.
 * The logout is handled client-side by removing the token.
 * 
 * In the future, we can implement:
 * - Token blacklist (Redis) for immediate invalidation
 * - Session tracking in database
 * - Refresh token revocation
 */
export class LogoutUseCase implements ILogoutUseCase {
    constructor(
        private userRepository: UserRepository,
        private sessionRepository?: SessionRepository,
        private presenceRepository?: UserPresenceRepository
    ) { }

    async execute(input: LogoutInputDTO): Promise<LogoutResponseDTO> {
        const { userId, refreshToken } = input;
        // Verify user exists
        const user = await this.userRepository.findById(userId);

        if (!user) {
            throw new Error('User not found');
        }

        if (this.sessionRepository) {
            if (refreshToken) {
                await this.sessionRepository.delete(refreshToken);
            } else {
                await this.sessionRepository.deleteAllForUser(userId);
            }
        }

        if (this.presenceRepository) {
            await this.presenceRepository.markOffline(userId, new Date());
        }

        return {
            message: 'Logged out successfully'
        };
    }
}
