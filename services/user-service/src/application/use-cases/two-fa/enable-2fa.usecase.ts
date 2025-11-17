import { NotFoundError } from '@transcendence/shared-utils';
import type { Enable2FAUseCase, TwoFAService, UserRepository } from '../../../domain/ports';

export class Enable2FAUseCaseImpl implements Enable2FAUseCase {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly twoFAService: TwoFAService
    ) { }

    async execute(userId: string, token: string): Promise<void> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new NotFoundError('User');
        }

        if (!user.twoFASecret) {
            throw new Error('2FA secret not generated');
        }

        const isValid = this.twoFAService.verifyToken(user.twoFASecret, token);
        if (!isValid) {
            throw new Error('Invalid 2FA token');
        }

        await this.userRepository.update(userId, {
            is2FAEnabled: true,
            updatedAt: new Date()
        });
    }
}
