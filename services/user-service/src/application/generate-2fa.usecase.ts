import { Generate2FAUseCase, UserRepository, TwoFAService } from '../domain/ports.js';
import { NotFoundError } from '@transcendence/shared-utils';

export class Generate2FAUseCaseImpl implements Generate2FAUseCase {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly twoFAService: TwoFAService
    ) { }

    async execute(userId: string): Promise<{ secret: string; qrCodeUrl: string; }> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new NotFoundError('User');
        }

        const secret = this.twoFAService.generateSecret();
        const label = `Transcendence (${user.email})`;
        const qrCodeUrl = await this.twoFAService.generateQRCode(secret, label);

        // Save the secret temporarily (user needs to verify it to enable 2FA)
        await this.userRepository.update(userId, {
            twoFASecret: secret,
            updatedAt: new Date()
        });

        return {
            secret,
            qrCodeUrl
        };
    }
}
