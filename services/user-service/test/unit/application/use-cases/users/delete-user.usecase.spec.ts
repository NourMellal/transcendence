import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DeleteUserUseCase } from '../../../../../src/application/use-cases/users/delete-user.usecase';
import {
    createMockFriendshipRepository,
    createMockSessionRepository,
    createMockUserRepository,
    createMockPresenceRepository,
    createMockUserEventsPublisher,
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
    let userEventsPublisher: ReturnType<typeof createMockUserEventsPublisher>;

    const factory = () =>
        new DeleteUserUseCase(
            userRepository,
            sessionRepository,
            friendshipRepository,
            presenceRepository,
            unitOfWork,
            userEventsPublisher
        );

    beforeEach(() => {
        userRepository = createMockUserRepository();
        sessionRepository = createMockSessionRepository();
        friendshipRepository = createMockFriendshipRepository();
        presenceRepository = createMockPresenceRepository();
        unitOfWork = {
            withTransaction: vi.fn(async (handler) => handler()),
        };
        userEventsPublisher = createMockUserEventsPublisher();
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
        expect(userEventsPublisher.publishUserDeleted).toHaveBeenCalledWith({
            userId: 'user-1',
            deletedAt: expect.any(Date),
            initiatedBy: 'user-1',
            reason: undefined,
        });
        expect(result).toEqual({ success: true });
    });

    it('throws when user missing', async () => {
        userRepository.findById.mockResolvedValue(null);
        const useCase = factory();

        await expect(useCase.execute({ userId: 'bad', initiatedBy: 'bad' })).rejects.toThrow('User not found');
        expect(userEventsPublisher.publishUserDeleted).not.toHaveBeenCalled();
    });
});
