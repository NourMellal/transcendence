import { UserRepository } from '../../domain/ports.js';

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
    constructor(private userRepository: UserRepository) { }

    async execute(userId: string): Promise<{ message: string }> {
        // Verify user exists
        const user = await this.userRepository.findById(userId);

        if (!user) {
            throw new Error('User not found');
        }

        // TODO: Future enhancements:
        // 1. Add token to blacklist (Redis)
        // 2. Delete refresh token from database
        // 3. Clear any active sessions
        // 4. Emit logout event for other services

        return {
            message: 'Logged out successfully'
        };
    }
}
