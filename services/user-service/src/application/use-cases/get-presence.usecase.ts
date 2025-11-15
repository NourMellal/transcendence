import type { UserPresenceRepository } from '../../domain/ports.js';
import type { UserPresence } from '../../domain/entities/presence.entity.js';

export class GetPresenceUseCase {
    constructor(private readonly presenceRepository: UserPresenceRepository) {}

    async execute(userId: string): Promise<UserPresence | null> {
        if (!userId) {
            throw new Error('User ID is required');
        }

        return this.presenceRepository.findByUserId(userId);
    }
}
