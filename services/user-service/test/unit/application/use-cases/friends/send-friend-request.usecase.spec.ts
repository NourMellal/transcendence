import { beforeEach, describe, expect, it } from 'vitest';
import { SendFriendRequestUseCase } from '../../../../../src/application/use-cases/friends/send-friend-request.usecase';
import {
    createMockFriendshipRepository,
    createMockUserRepository,
} from '../../../../helpers/mock-repositories';
import { createTestUser } from '../../../../helpers/entity-factories';
import { UserId } from '../../../../../src/domain/value-objects';

describe('SendFriendRequestUseCase', () => {
    let friendshipRepository: ReturnType<typeof createMockFriendshipRepository>;
    let userRepository: ReturnType<typeof createMockUserRepository>;
    const factory = () => new SendFriendRequestUseCase(friendshipRepository, userRepository);

    beforeEach(() => {
        friendshipRepository = createMockFriendshipRepository();
        userRepository = createMockUserRepository();
    });

    it('creates new friend request', async () => {
        userRepository.findById.mockResolvedValue(createTestUser({ id: new UserId('friend') }));
        friendshipRepository.findBetweenUsers.mockResolvedValue(null);

        const result = await factory().execute({
            requesterId: 'userA',
            friendId: 'friend',
        });

        expect(friendshipRepository.save).toHaveBeenCalledTimes(1);
        expect(result.status).toBe('pending');
    });

    it('prevents duplicate pending request', async () => {
        userRepository.findById.mockResolvedValue(createTestUser({ id: new UserId('friend') }));
        friendshipRepository.findBetweenUsers.mockResolvedValue({
            id: 'existing',
            requesterId: 'userA',
            addresseeId: 'friend',
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date(),
        } as any);

        await expect(
            factory().execute({ requesterId: 'userA', friendId: 'friend' })
        ).rejects.toThrow('Friend request already pending');
    });
});
