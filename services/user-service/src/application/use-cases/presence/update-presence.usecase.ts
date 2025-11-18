import { PresenceStatus } from '../../../domain/entities/presence.entity';
import type { UserPresenceRepository } from '../../../domain/ports';

interface UpdatePresenceInput {
    userId: string;
    status: PresenceStatus;
}

export class UpdatePresenceUseCase {
    constructor(private readonly presenceRepository: UserPresenceRepository) {}

    async execute({ userId, status }: UpdatePresenceInput): Promise<void> {
        if (!userId) {
            throw new Error('User ID is required');
        }
        await this.presenceRepository.upsert(userId, status, new Date());
    }
}
