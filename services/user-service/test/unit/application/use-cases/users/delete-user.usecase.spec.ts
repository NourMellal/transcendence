import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DeleteUserUseCase } from '../../../../../src/application/use-cases/users/delete-user.usecase';
import {
    createMockFriendshipRepository,
    createMockSessionRepository,
    createMockUserRepository,
    createMockPresenceRepository,
} from '../../../../helpers/mock-repositories';
import { createTestUser } from '../../../../helpers/entity-factories';
import { UserId } from '../../../../../src/domain/value-objects';
import type { UnitOfWork } from '../../../../../src/domain/ports';

describe('DeleteUserUseCase', () => {
    let userRepository: ReturnType<typeof createMockUserRepository>;
    let sessionRepository: ReturnType<typeof createMockSessionRepository>;
    let friendshipRepository: ReturnType<typeof createMockFriendshipRepository>;
    let presenceRepository: ReturnType<typeof createMockPresenceRepository>;
    let unitOfWork: UnitOfWork;

    const factory = () =>
        new DeleteUserUseCase(
            userRepository,
            sessionRepository,
            friendshipRepository,
            presenceRepository,
            unitOfWork
        );

    beforeEach(() => {
        userRepository = createMockUserRepository();
        sessionRepository = createMockSessionRepository();
        friendshipRepository = createMockFriendshipRepository();
        presenceRepository = createMockPresenceRepository();
        unitOfWork = {
            withTransaction: vi.fn(async (handler) => handler()),
        };
    });

    it('deletes user and related data', async () => {
        const user = createTestUser({ id: new UserId('user-1') });
        userRepository.findById.mockResolvedValue(user);

        const useCase = factory();
        const result = await useCase.execute({ userId: 'user-1', initiatedBy: 'user-1' });

        expect(sessionRepository.deleteAllForUser).toHaveBeenCalledWith('user-1');
        expect(friendshipRepository.deleteAllForUser).toHaveBeenCalledWith('user-1');
        expect(presenceRepository.markOffline).toHaveBeenCalledWith('user-1', expect.any(Date));
        expect(userRepository.delete).toHaveBeenCalledWith('user-1');
        expect(result).toEqual({ success: true });
    });

    it('throws when user missing', async () => {
        userRepository.findById.mockResolvedValue(null);
        const useCase = factory();

        await expect(useCase.execute({ userId: 'bad', initiatedBy: 'bad' })).rejects.toThrow('User not found');
    });
});
