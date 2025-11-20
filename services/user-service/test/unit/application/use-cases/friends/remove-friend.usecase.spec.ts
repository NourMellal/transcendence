import { beforeEach, describe, expect, it } from 'vitest';
import { RemoveFriendUseCase } from '../../../../../src/application/use-cases/friends/remove-friend.usecase';
import { createMockFriendshipRepository } from '../../../../helpers/mock-repositories';
import { FriendshipStatus } from '../../../../../src/domain/entities/friendship.entity';

describe('RemoveFriendUseCase', () => {
    let friendshipRepository: ReturnType<typeof createMockFriendshipRepository>;
    const factory = () => new RemoveFriendUseCase(friendshipRepository);

    beforeEach(() => {
        friendshipRepository = createMockFriendshipRepository();
    });

    it('removes accepted friendship for participant', async () => {
        friendshipRepository.findBetweenUsers.mockResolvedValue({
            id: 'friendship',
            requesterId: 'userA',
            addresseeId: 'userB',
            status: FriendshipStatus.ACCEPTED,
        } as any);

        await factory().execute({ userId: 'userA', friendId: 'userB' });

        expect(friendshipRepository.delete).toHaveBeenCalledWith('friendship');
    });

    it('throws when friendship not found', async () => {
        friendshipRepository.findBetweenUsers.mockResolvedValue(null);
        await expect(factory().execute({ userId: 'userA', friendId: 'userB' })).rejects.toThrow('Friendship not found');
    });
});
