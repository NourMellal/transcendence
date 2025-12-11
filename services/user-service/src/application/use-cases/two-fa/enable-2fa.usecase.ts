import { NotFoundError } from '@transcendence/shared-utils';
import type { IEnable2FAUseCase } from '../../../domain/ports';
import type { TwoFAService, UserRepository } from '../../../domain/ports';
import type { Enable2FAInputDTO } from '../../dto/auth.dto';

export class Enable2FAUseCaseImpl implements IEnable2FAUseCase {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly twoFAService: TwoFAService
    ) { }

    async execute(input: Enable2FAInputDTO): Promise<void> {
        const user = await this.userRepository.findById(input.userId);
        if (!user) {
            throw new NotFoundError('User');
        }

        if (!user.twoFASecret) {
            throw new Error('2FA secret not generated');
        }

        const isValid = this.twoFAService.verifyToken(user.twoFASecret, input.token);
        if (!isValid) {
            throw new Error('Invalid 2FA token');
        }

        await this.userRepository.update(input.userId, {
            is2FAEnabled: true,
            updatedAt: new Date()
        });
    }
}
