import { Verify2FAUseCase, UserRepository, TwoFAService } from '../../domain/ports';

export class Verify2FAUseCaseImpl implements Verify2FAUseCase {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly twoFAService: TwoFAService
    ) {}

    async execute(userId: string, token: string): Promise<boolean> {
        // Get user
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        // Check if 2FA is enabled
        if (!user.is2FAEnabled || !user.twoFASecret) {
            throw new Error('2FA is not enabled for this user');
        }

        // Verify the token
        return this.twoFAService.verifyToken(user.twoFASecret, token);
    }
}
