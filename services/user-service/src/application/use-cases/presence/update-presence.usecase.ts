import type { UserPresenceRepository } from '../../../domain/ports';
import type { IUpdatePresenceUseCase } from '../../../domain/ports';
import type { UpdatePresenceInputDTO } from '../../dto/presence.dto';
import { PresenceStatus } from '../../../domain/entities/presence.entity';

export class UpdatePresenceUseCase implements IUpdatePresenceUseCase {
    constructor(private readonly presenceRepository: UserPresenceRepository) {}

    async execute({ userId, status }: UpdatePresenceInputDTO): Promise<void> {
        if (!userId) {
            throw new Error('User ID is required');
        }
        const normalizedStatus = status === 'online' ? PresenceStatus.ONLINE : PresenceStatus.OFFLINE;
        await this.presenceRepository.upsert(userId, normalizedStatus, new Date());
    }
}
