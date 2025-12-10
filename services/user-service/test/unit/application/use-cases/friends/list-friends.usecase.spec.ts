import { beforeEach, describe, expect, it } from 'vitest';
import { ListFriendsUseCase } from '../../../../../src/application/use-cases/friends/list-friends.usecase';
import {
    createMockFriendshipRepository,
    createMockPresenceRepository,
    createMockUserRepository,
} from '../../../../helpers/mock-repositories';
import { createFriendship, createTestUser } from '../../../../helpers/entity-factories';
import { UserId } from '../../../../../src/domain/value-objects';
import { PresenceStatus } from '../../../../../src/domain/entities/presence.entity';

describe('ListFriendsUseCase', () => {
    let friendshipRepository: ReturnType<typeof createMockFriendshipRepository>;
    let userRepository: ReturnType<typeof createMockUserRepository>;
    let presenceRepository: ReturnType<typeof createMockPresenceRepository>;
    const factory = () => new ListFriendsUseCase(friendshipRepository, userRepository, presenceRepository);

    beforeEach(() => {
        friendshipRepository = createMockFriendshipRepository();
        userRepository = createMockUserRepository();
        presenceRepository = createMockPresenceRepository();
    });

    it('lists friends with resolved user data', async () => {
        const friendship = createFriendship('userA', 'userB', 'accepted');
        friendshipRepository.listForUser.mockResolvedValue([friendship]);

        userRepository.findById.mockResolvedValue(
            createTestUser({ id: new UserId(friendship.addresseeId) })
        );

        presenceRepository.findByUserId.mockResolvedValue({
            userId: friendship.addresseeId,
            status: PresenceStatus.ONLINE,
            lastSeenAt: new Date(),
        });

        const result = await factory().execute({ userId: 'userA' });

        expect(result.totalCount).toBe(1);
        expect(result.friends[0].id).toBe(friendship.addresseeId);
        expect(result.friends[0].isOnline).toBe(true);
    });
});
