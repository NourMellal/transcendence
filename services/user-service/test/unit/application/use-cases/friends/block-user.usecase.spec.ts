import { beforeEach, describe, expect, it } from 'vitest';
import { BlockUserUseCase } from '../../../../../src/application/use-cases/friends/block-user.usecase';
import {
    createMockFriendshipRepository,
    createMockUserRepository,
} from '../../../../helpers/mock-repositories';
import { createTestUser } from '../../../../helpers/entity-factories';
import { UserId } from '../../../../../src/domain/value-objects';
import { FriendshipStatus } from '../../../../../src/domain/entities/friendship.entity';

describe('BlockUserUseCase', () => {
    let friendshipRepository: ReturnType<typeof createMockFriendshipRepository>;
    let userRepository: ReturnType<typeof createMockUserRepository>;
    const factory = () => new BlockUserUseCase(friendshipRepository, userRepository);

    beforeEach(() => {
        friendshipRepository = createMockFriendshipRepository();
        userRepository = createMockUserRepository();
    });

    it('creates new blocked friendship when none exists', async () => {
        userRepository.findById.mockResolvedValue(createTestUser({ id: new UserId('other') }));
        friendshipRepository.findBetweenUsers.mockResolvedValue(null);

        const result = await factory().execute({ userId: 'userA', otherUserId: 'other' });

        expect(friendshipRepository.save).toHaveBeenCalledTimes(1);
        expect(result.status).toBe('blocked');
    });

    it('updates existing friendship to blocked', async () => {
        userRepository.findById.mockResolvedValue(createTestUser({ id: new UserId('other') }));
        friendshipRepository.findBetweenUsers.mockResolvedValue({
            id: 'friendship',
            requesterId: 'userA',
            addresseeId: 'other',
            status: FriendshipStatus.ACCEPTED,
            createdAt: new Date(),
            updatedAt: new Date(),
        } as any);

        const result = await factory().execute({ userId: 'userA', otherUserId: 'other' });

        expect(friendshipRepository.update).toHaveBeenCalledWith(
            'friendship',
            expect.objectContaining({ status: FriendshipStatus.BLOCKED })
        );
        expect(result.status).toBe('blocked');
    });
});
