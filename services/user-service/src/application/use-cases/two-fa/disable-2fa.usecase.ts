import { NotFoundError } from '@transcendence/shared-utils';
import type { IDisable2FAUseCase } from '../../../domain/ports';
import type { TwoFAService, UserRepository } from '../../../domain/ports';
import type { Disable2FAInputDTO } from '../../dto/auth.dto';

export class Disable2FAUseCaseImpl implements IDisable2FAUseCase {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly twoFAService: TwoFAService
    ) { }

    async execute(input: Disable2FAInputDTO): Promise<void> {
        const user = await this.userRepository.findById(input.userId);
        if (!user) {
            throw new NotFoundError('User');
        }

        if (!user.is2FAEnabled || !user.twoFASecret) {
            throw new Error('Two-factor authentication is not enabled');
        }

        const isValid = this.twoFAService.verifyToken(user.twoFASecret, input.token);
        if (!isValid) {
            throw new Error('Invalid 2FA token');
        }

        await this.userRepository.update(input.userId, {
            is2FAEnabled: false,
            twoFASecret: null as any,
            updatedAt: new Date()
        });
    }
}
