import { beforeEach, describe, expect, it } from 'vitest';
import { UpdatePresenceUseCase } from '../../../../../src/application/use-cases/presence/update-presence.usecase';
import { createMockPresenceRepository } from '../../../../helpers/mock-repositories';
import { PresenceStatus } from '../../../../../src/domain/entities/presence.entity';

describe('UpdatePresenceUseCase', () => {
    let presenceRepository: ReturnType<typeof createMockPresenceRepository>;
    let useCase: UpdatePresenceUseCase;

    beforeEach(() => {
        presenceRepository = createMockPresenceRepository();
        useCase = new UpdatePresenceUseCase(presenceRepository);
    });

    it('upserts online presence', async () => {
        await useCase.execute({ userId: 'user-1', status: 'online' });
        expect(presenceRepository.upsert).toHaveBeenCalledWith('user-1', PresenceStatus.ONLINE, expect.any(Date));
    });

    it('throws when userId missing', async () => {
        await expect(useCase.execute({ userId: '', status: 'offline' })).rejects.toThrow('User ID is required');
    });
});
