import { NotFoundError } from '@transcendence/shared-utils';
import type { Disable2FAUseCase, TwoFAService, UserRepository } from '../../../domain/ports.js';

export class Disable2FAUseCaseImpl implements Disable2FAUseCase {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly twoFAService: TwoFAService
    ) { }

    async execute(userId: string, token: string): Promise<void> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new NotFoundError('User');
        }

        if (!user.is2FAEnabled || !user.twoFASecret) {
            throw new Error('Two-factor authentication is not enabled');
        }

        const isValid = this.twoFAService.verifyToken(user.twoFASecret, token);
        if (!isValid) {
            throw new Error('Invalid 2FA token');
        }

        await this.userRepository.update(userId, {
            is2FAEnabled: false,
            twoFASecret: null as any,
            updatedAt: new Date()
        });
    }
}
