import { describe, expect, it } from 'vitest';
import type { Session } from '../../../../src/domain/entities/user.entity';

describe('Session entity', () => {
    it('represents refresh-session state', () => {
        const session: Session = {
            id: 'session-1',
            userId: 'user-1',
            token: 'refresh-token',
            expiresAt: new Date(Date.now() + 1000),
            createdAt: new Date(),
        };

        expect(session.id).toBe('session-1');
        expect(session.token).toBe('refresh-token');
    });
});
