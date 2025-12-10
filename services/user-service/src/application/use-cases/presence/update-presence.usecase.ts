import type { UserPresenceRepository } from '../../../domain/ports';
import type { IUpdatePresenceUseCase } from '../../../domain/ports';
import type { UpdatePresenceInputDTO } from '../../dto/presence.dto';
import { PresenceStatus } from '../../../domain/entities/presence.entity';

const VALID_STATUSES = ['ONLINE', 'OFFLINE', 'INGAME'] as const;
type ValidStatus = typeof VALID_STATUSES[number];

const STATUS_MAP: Record<ValidStatus, PresenceStatus> = {
    ONLINE: PresenceStatus.ONLINE,
    OFFLINE: PresenceStatus.OFFLINE,
    INGAME: PresenceStatus.INGAME,
};

export class UpdatePresenceUseCase implements IUpdatePresenceUseCase {
    constructor(private readonly presenceRepository: UserPresenceRepository) {}

    async execute({ userId, status }: UpdatePresenceInputDTO): Promise<void> {
        if (!userId) {
            throw new Error('User ID is required');
        }
        
        if (!VALID_STATUSES.includes(status as ValidStatus)) {
            throw new Error(`Invalid status: ${status}. Must be one of: ${VALID_STATUSES.join(', ')}`);
        }
        
        const normalizedStatus = STATUS_MAP[status as ValidStatus];
        await this.presenceRepository.upsert(userId, normalizedStatus, new Date());
    }
}
