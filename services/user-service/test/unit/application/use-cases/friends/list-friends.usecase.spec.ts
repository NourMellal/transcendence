import { beforeEach, describe, expect, it } from 'vitest';
import { ListFriendsUseCase } from '../../../../../src/application/use-cases/friends/list-friends.usecase';
import {
    createMockFriendshipRepository,
    createMockUserRepository,
} from '../../../../helpers/mock-repositories';
import { createFriendship, createTestUser } from '../../../../helpers/entity-factories';
import { UserId } from '../../../../../src/domain/value-objects';

describe('ListFriendsUseCase', () => {
    let friendshipRepository: ReturnType<typeof createMockFriendshipRepository>;
    let userRepository: ReturnType<typeof createMockUserRepository>;
    const factory = () => new ListFriendsUseCase(friendshipRepository, userRepository);

    beforeEach(() => {
        friendshipRepository = createMockFriendshipRepository();
        userRepository = createMockUserRepository();
    });

    it('lists friends with resolved user data', async () => {
        const friendship = createFriendship('userA', 'userB', 'accepted');
        friendshipRepository.listForUser.mockResolvedValue([friendship]);

        userRepository.findById.mockResolvedValue(
            createTestUser({ id: new UserId(friendship.addresseeId) })
        );

        const result = await factory().execute({ userId: 'userA' });

        expect(result.totalCount).toBe(1);
        expect(result.friends[0].id).toBe(friendship.addresseeId);
    });
});
