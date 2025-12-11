import { NotFoundError } from '@transcendence/shared-utils';
import type { IGenerate2FAUseCase } from '../../../domain/ports';
import type { TwoFAService, UserRepository } from '../../../domain/ports';
import type { Generate2FAInputDTO } from '../../dto/auth.dto';

export class Generate2FAUseCaseImpl implements IGenerate2FAUseCase {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly twoFAService: TwoFAService
    ) { }

    async execute(input: Generate2FAInputDTO): Promise<{ secret: string; qrCode: string; }> {
        const user = await this.userRepository.findById(input.userId);
        if (!user) {
            throw new NotFoundError('User');
        }

        const secret = this.twoFAService.generateSecret();
        const label = `Transcendence (${user.email.toString()})`;
        const qrCode = await this.twoFAService.generateQRCode(secret, label);

        await this.userRepository.update(input.userId, {
            twoFASecret: secret,
            updatedAt: new Date()
        });

        return {
            secret,
            qrCode
        };
    }
}
