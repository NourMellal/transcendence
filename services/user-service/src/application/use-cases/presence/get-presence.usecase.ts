import type { UserPresenceRepository } from '../../../domain/ports';
import type { IGetPresenceUseCase } from '../../../domain/ports';
import type { GetPresenceInputDTO, PresenceResponseDTO } from '../../dto/presence.dto';

export class GetPresenceUseCase implements IGetPresenceUseCase {
    constructor(private readonly presenceRepository: UserPresenceRepository) {}

    async execute(input: GetPresenceInputDTO): Promise<PresenceResponseDTO | null> {
        if (!input.userId) {
            throw new Error('User ID is required');
        }

        const presence = await this.presenceRepository.findByUserId(input.userId);
        if (!presence) {
            return null;
        }

        return {
            userId: presence.userId,
            status: presence.status,
            lastSeenAt: presence.lastSeenAt.toISOString(),
        };
    }
}
