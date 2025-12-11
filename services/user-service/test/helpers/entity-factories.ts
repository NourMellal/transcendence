import { randomUUID } from 'crypto';
import { createUser } from '../../src/domain/entities/user.entity';
import { FriendshipDomain } from '../../src/domain/entities/friendship.entity';
import type { Friendship } from '../../src/domain/entities/friendship.entity';
import type { User } from '../../src/domain/entities/user.entity';
import { DisplayName, Email, Username, UserId } from '../../src/domain/value-objects';

export function createTestUser(overrides: Partial<User> = {}): User {
    const base = createUser({
        id: overrides.id ? overrides.id : new UserId(randomUUID()),
        email: overrides.email ?? new Email('user@example.com'),
        username: overrides.username ?? new Username('player_one'),
        displayName: overrides.displayName ?? new DisplayName('Player One'),
        passwordHash: overrides.passwordHash,
        is2FAEnabled: overrides.is2FAEnabled,
        avatar: overrides.avatar,
        oauthProvider: overrides.oauthProvider,
        oauthId: overrides.oauthId,
    });

    return {
        ...base,
        ...overrides,
    };
}

export function createFriendship(
    requesterId: string,
    addresseeId: string,
    status?: Friendship['status']
): Friendship {
    if (!status || status === 'pending') {
        return FriendshipDomain.createRequest(requesterId, addresseeId);
    }

    if (status === 'blocked') {
        return FriendshipDomain.createBlocked(requesterId, addresseeId, requesterId);
    }

    const friendship = FriendshipDomain.createRequest(requesterId, addresseeId);
    return FriendshipDomain.transition(friendship, {
        type: status === 'accepted' ? 'ACCEPT' : 'REJECT',
    });
}
