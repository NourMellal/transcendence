import { beforeEach, describe, expect, it } from 'vitest';
import { GetPresenceUseCase } from '../../../../../src/application/use-cases/presence/get-presence.usecase';
import { createMockPresenceRepository } from '../../../../helpers/mock-repositories';
import { PresenceStatus } from '../../../../../src/domain/entities/presence.entity';

describe('GetPresenceUseCase', () => {
    let presenceRepository: ReturnType<typeof createMockPresenceRepository>;
    let useCase: GetPresenceUseCase;

    beforeEach(() => {
        presenceRepository = createMockPresenceRepository();
        useCase = new GetPresenceUseCase(presenceRepository);
    });

    it('returns presence DTO when found', async () => {
        presenceRepository.findByUserId.mockResolvedValue({
            userId: 'user-1',
            status: PresenceStatus.ONLINE,
            lastSeenAt: new Date('2024-01-01T00:00:00Z'),
        });

        const result = await useCase.execute({ userId: 'user-1' });

        expect(result).toEqual({
            userId: 'user-1',
            status: PresenceStatus.ONLINE,
            lastSeenAt: '2024-01-01T00:00:00.000Z',
        });
    });

    it('returns null when presence missing', async () => {
        presenceRepository.findByUserId.mockResolvedValue(null);
        const result = await useCase.execute({ userId: 'user-1' });
        expect(result).toBeNull();
    });

    it('throws when userId missing', async () => {
        await expect(useCase.execute({ userId: '' })).rejects.toThrow('User ID is required');
    });
});
