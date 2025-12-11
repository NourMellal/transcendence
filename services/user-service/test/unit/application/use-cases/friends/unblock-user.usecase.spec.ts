import { beforeEach, describe, expect, it } from 'vitest';
import { UnblockUserUseCase } from '../../../../../src/application/use-cases/friends/unblock-user.usecase';
import { createMockFriendshipRepository } from '../../../../helpers/mock-repositories';
import { FriendshipStatus } from '../../../../../src/domain/entities/friendship.entity';

describe('UnblockUserUseCase', () => {
    let friendshipRepository: ReturnType<typeof createMockFriendshipRepository>;
    const factory = () => new UnblockUserUseCase(friendshipRepository);

    beforeEach(() => {
        friendshipRepository = createMockFriendshipRepository();
    });

    it('unblocks friendship when requester blocked it', async () => {
        friendshipRepository.findBetweenUsers.mockResolvedValue({
            id: 'friendship',
            requesterId: 'userA',
            addresseeId: 'userB',
            status: FriendshipStatus.BLOCKED,
            blockedBy: 'userA',
            createdAt: new Date(),
            updatedAt: new Date(),
        } as any);

        const result = await factory().execute({ userId: 'userA', otherUserId: 'userB' });

        expect(friendshipRepository.update).toHaveBeenCalledWith('friendship', {
            status: FriendshipStatus.REJECTED,
            blockedBy: undefined,
        });
        expect(result.status).toBe('rejected');
    });

    it('throws when no blocked friendship', async () => {
        friendshipRepository.findBetweenUsers.mockResolvedValue(null);
        await expect(factory().execute({ userId: 'userA', otherUserId: 'userB' })).rejects.toThrow(
            'Blocked friendship not found'
        );
    });
});
