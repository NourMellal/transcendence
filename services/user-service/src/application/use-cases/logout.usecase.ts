import { UserRepository, SessionRepository } from '../../domain/ports.js';

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
export class LogoutUseCase {
    constructor(
        private userRepository: UserRepository,
        private sessionRepository?: SessionRepository
    ) { }

    async execute(userId: string, sessionToken?: string): Promise<{ message: string }> {
        // Verify user exists
        const user = await this.userRepository.findById(userId);

        if (!user) {
            throw new Error('User not found');
        }

        if (this.sessionRepository) {
            if (sessionToken) {
                await this.sessionRepository.delete(sessionToken);
            } else {
                await this.sessionRepository.deleteAllForUser(userId);
            }
        }

        return {
            message: 'Logged out successfully'
        };
    }
}
