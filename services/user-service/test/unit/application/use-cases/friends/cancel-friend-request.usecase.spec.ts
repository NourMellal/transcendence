import { beforeEach, describe, expect, it } from 'vitest';
import { CancelFriendRequestUseCase } from '../../../../../src/application/use-cases/friends/cancel-friend-request.usecase';
import { createMockFriendshipRepository } from '../../../../helpers/mock-repositories';
import { FriendshipStatus } from '../../../../../src/domain/entities/friendship.entity';

describe('CancelFriendRequestUseCase', () => {
    let friendshipRepository: ReturnType<typeof createMockFriendshipRepository>;
    const factory = () => new CancelFriendRequestUseCase(friendshipRepository);

    beforeEach(() => {
        friendshipRepository = createMockFriendshipRepository();
    });

    it('deletes pending request when requester cancels', async () => {
        friendshipRepository.findById.mockResolvedValue({
            id: 'friendship',
            requesterId: 'userA',
            status: FriendshipStatus.PENDING,
        } as any);

        await factory().execute({ requesterId: 'userA', friendshipId: 'friendship' });

        expect(friendshipRepository.delete).toHaveBeenCalledWith('friendship');
    });

    it('throws when friendship not pending', async () => {
        friendshipRepository.findById.mockResolvedValue({
            id: 'friendship',
            requesterId: 'userA',
            status: FriendshipStatus.ACCEPTED,
        } as any);

        await expect(factory().execute({ requesterId: 'userA', friendshipId: 'friendship' }))
            .rejects
            .toThrow('Only pending requests can be cancelled');
    });
});
