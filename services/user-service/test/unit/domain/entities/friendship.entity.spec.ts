import { describe, expect, it } from 'vitest';
import {
    FriendshipDomain,
    FriendshipStatus,
} from '../../../../src/domain/entities/friendship.entity';

describe('FriendshipDomain', () => {
    it('creates a pending request', () => {
        const friendship = FriendshipDomain.createRequest('userA', 'userB');
        expect(friendship.status).toBe(FriendshipStatus.PENDING);
        expect(friendship.requesterId).toBe('userA');
        expect(friendship.addresseeId).toBe('userB');
    });

    it('prevents sending request to self', () => {
        expect(() => FriendshipDomain.createRequest('userA', 'userA')).toThrow('Cannot send friend request to yourself');
    });

    it('accepts and rejects pending friendships', () => {
        const request = FriendshipDomain.createRequest('requester', 'target');
        const accepted = FriendshipDomain.transition(request, { type: 'ACCEPT' });
        expect(accepted.status).toBe(FriendshipStatus.ACCEPTED);

        const pending = FriendshipDomain.createRequest('requester', 'target');
        const rejected = FriendshipDomain.transition(pending, { type: 'REJECT' });
        expect(rejected.status).toBe(FriendshipStatus.REJECTED);
    });

    it('blocks and unblocks friendships', () => {
        const blocked = FriendshipDomain.createBlocked('userA', 'userB', 'userA');
        expect(blocked.status).toBe(FriendshipStatus.BLOCKED);

        const unblocked = FriendshipDomain.transition(blocked, { type: 'UNBLOCK' });
        expect(unblocked.status).toBe(FriendshipStatus.REJECTED);
        expect(unblocked.blockedBy).toBeUndefined();
    });
});
