import { describe, expect, it } from 'vitest';
import {
    FriendshipDomain,
    FriendshipStatus
} from '../../../../src/domain/entities/friendship.entity';

describe('FriendshipDomain Service', () => {
    it('creates blocked friendships with correct metadata', () => {
        const friendship = FriendshipDomain.createBlocked('userA', 'userB', 'userA');
        expect(friendship.status).toBe(FriendshipStatus.BLOCKED);
        expect(friendship.blockedBy).toBe('userA');
    });

    it('rejects block attempts by non participants', () => {
        expect(() => FriendshipDomain.createBlocked('userA', 'userB', 'userC')).toThrow(
            'BlockedBy must be part of the friendship'
        );
    });

    it('transitions pending friendships', () => {
        const friendship = FriendshipDomain.createRequest('requester', 'addressee');
        const cancelled = FriendshipDomain.transition(friendship, { type: 'CANCEL' });
        expect(cancelled.status).toBe(FriendshipStatus.REJECTED);
    });
});
