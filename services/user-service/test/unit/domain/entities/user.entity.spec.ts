import { describe, expect, it } from 'vitest';
import { createUser } from '../../../../src/domain/entities/user.entity';
import { DisplayName, Email, Username, UserId } from '../../../../src/domain/value-objects';

describe('User Entity', () => {
    it('creates a user with sensible defaults', () => {
        const user = createUser({
            id: new UserId('user-1'),
            email: new Email('user@example.com'),
            username: new Username('player_one'),
        });

        expect(user.id.toString()).toBe('user-1');
        expect(user.displayName.toString()).toBe('player_one');
        expect(user.is2FAEnabled).toBe(false);
        expect(user.createdAt).toBeInstanceOf(Date);
    });

    it('respects provided display name and oauth provider', () => {
        const user = createUser({
            id: new UserId('user-42'),
            email: new Email('oauth@example.com'),
            username: new Username('oauth_user'),
            displayName: new DisplayName('OAuth User'),
            oauthProvider: '42',
            oauthId: '12345',
        });

        expect(user.displayName.toString()).toBe('OAuth User');
        expect(user.oauthProvider).toBe('42');
        expect(user.oauthId).toBe('12345');
    });
});
