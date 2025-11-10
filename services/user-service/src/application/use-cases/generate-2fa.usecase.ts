import { NotFoundError } from '@transcendence/shared-utils';
import type { Generate2FAUseCase, TwoFAService, UserRepository } from '../../domain/ports.js';

export class Generate2FAUseCaseImpl implements Generate2FAUseCase {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly twoFAService: TwoFAService
    ) { }

    async execute(userId: string): Promise<{ secret: string; qrCode: string; }> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new NotFoundError('User');
        }

        const secret = this.twoFAService.generateSecret();
        const label = `Transcendence (${user.email})`;
        const qrCode = await this.twoFAService.generateQRCode(secret, label);

        await this.userRepository.update(userId, {
            twoFASecret: secret,
            updatedAt: new Date()
        });

        return {
            secret,
            qrCode
        };
    }
}
