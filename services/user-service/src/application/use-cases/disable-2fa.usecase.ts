import { Disable2FAUseCase, UserRepository, TwoFAService } from '../../domain/ports';

export class Disable2FAUseCaseImpl implements Disable2FAUseCase {
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

        // Check if 2FA is enabled
        if (!user.is2FAEnabled) {
            throw new Error('2FA is not enabled for this user');
        }

        // Verify the provided token
        if (!user.twoFASecret) {
            throw new Error('2FA secret not found');
        }

        const isValidToken = this.twoFAService.verifyToken(user.twoFASecret, token);
        if (!isValidToken) {
            throw new Error('Invalid 2FA token');
        }

        // Disable 2FA and remove secret
        await this.userRepository.update(userId, {
            is2FAEnabled: false,
            twoFASecret: undefined,
            updatedAt: new Date()
        });
    }
}
