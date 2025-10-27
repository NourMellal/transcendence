import { AuthenticateUserUseCase, UserRepository } from '../../domain/ports';
import { User } from '../../domain/entities';
import { JWTService } from '../../adapters/external/jwt.service';

export class AuthenticateUserUseCaseImpl implements AuthenticateUserUseCase {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly jwtService: JWTService
    ) {}

    /**
     * Authenticate user using JWT token
     */
    async execute(jwtToken: string): Promise<User | null> {
        try {
            // Step 1: Verify and decode JWT token
            const payload = this.jwtService.verifyToken(jwtToken);

            if (!payload || !payload.userId) {
                return null;
            }

            // Step 2: Get user from database (ensures user still exists)
            const user = await this.userRepository.findById(payload.userId);

            if (!user) {
                return null; // User was deleted
            }

            return user;

        } catch (error) {
            // JWT verification failed (expired, invalid, etc.)
            return null;
        }
    }
}
