import { beforeEach, describe, expect, it } from 'vitest';
import { RespondFriendRequestUseCase } from '../../../../../src/application/use-cases/friends/respond-friend-request.usecase';
import { createMockFriendshipRepository } from '../../../../helpers/mock-repositories';
import { FriendshipStatus } from '../../../../../src/domain/entities/friendship.entity';

describe('RespondFriendRequestUseCase', () => {
    let friendshipRepository: ReturnType<typeof createMockFriendshipRepository>;
    const factory = () => new RespondFriendRequestUseCase(friendshipRepository);

    beforeEach(() => {
        friendshipRepository = createMockFriendshipRepository();
    });

    it('accepts pending request', async () => {
        friendshipRepository.findById.mockResolvedValue({
            id: 'friendship',
            requesterId: 'userA',
            addresseeId: 'userB',
            status: FriendshipStatus.PENDING,
            createdAt: new Date(),
            updatedAt: new Date(),
        } as any);

        const result = await factory().execute({
            friendshipId: 'friendship',
            userId: 'userB',
            status: FriendshipStatus.ACCEPTED,
        });

        expect(friendshipRepository.update).toHaveBeenCalled();
        expect(result.status).toBe(FriendshipStatus.ACCEPTED);
    });

    it('throws when user is not recipient', async () => {
        friendshipRepository.findById.mockResolvedValue({
            id: 'friendship',
            requesterId: 'userA',
            addresseeId: 'userB',
            status: FriendshipStatus.PENDING,
            createdAt: new Date(),
            updatedAt: new Date(),
        } as any);

        await expect(
            factory().execute({
                friendshipId: 'friendship',
                userId: 'userA',
                status: FriendshipStatus.ACCEPTED,
            })
        ).rejects.toThrow('Only the recipient can respond to this request');
    });
});
