import { Enable2FAUseCase, UserRepository, TwoFAService } from '../../domain/ports';

export class Enable2FAUseCaseImpl implements Enable2FAUseCase {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly twoFAService: TwoFAService
    ) {}

    async execute(userId: string, token: string): Promise<void> {
        // Get user
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        // Check if 2FA is already enabled
        if (user.is2FAEnabled) {
            throw new Error('2FA is already enabled for this user');
        }

        // Verify the provided token with user's secret
        if (!user.twoFASecret) {
            throw new Error('2FA secret not found. Please generate a new secret first');
        }

        const isValidToken = this.twoFAService.verifyToken(user.twoFASecret, token);
        if (!isValidToken) {
            throw new Error('Invalid 2FA token');
        }

        // Enable 2FA for user
        await this.userRepository.update(userId, {
            is2FAEnabled: true,
            updatedAt: new Date()
        });
    }
}
