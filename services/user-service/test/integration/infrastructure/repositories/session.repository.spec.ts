import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';
import type { Database } from 'sqlite';
import { SQLiteSessionRepository } from '../../../../src/infrastructure/database/repositories/sqlite-session.repository';
import { createTestDatabase, closeTestDatabase } from '../../../helpers/test-database';

type PersistedSession = Parameters<SQLiteSessionRepository['save']>[0];

describe('SQLiteSessionRepository (integration)', () => {
    let db: Database | null = null;
    let repository: SQLiteSessionRepository;

    const buildSession = (overrides: Partial<PersistedSession> = {}): PersistedSession => ({
        id: overrides.id ?? randomUUID(),
        userId: overrides.userId ?? randomUUID(),
        token: overrides.token ?? randomUUID(),
        expiresAt: overrides.expiresAt ?? new Date(Date.now() + 60_000),
        createdAt: overrides.createdAt ?? new Date(),
    });

    beforeEach(async () => {
        db = await createTestDatabase();
        repository = new SQLiteSessionRepository();
        await repository.initialize(':memory:', db);
    });

    afterEach(async () => {
        if (db) {
            await closeTestDatabase(db);
            db = null;
        }
    });

    it('saves and finds sessions by token', async () => {
        const session = buildSession();
        await repository.save(session);

        const found = await repository.findByToken(session.token);
        expect(found).toMatchObject({
            id: session.id,
            userId: session.userId,
            token: session.token,
        });
    });

    it('lists sessions by user', async () => {
        const userId = randomUUID();
        await repository.save(buildSession({ userId }));
        await repository.save(buildSession({ userId }));
        await repository.save(buildSession({ userId: randomUUID() }));

        const sessions = await repository.findByUserId(userId);
        expect(sessions).toHaveLength(2);
    });

    it('deletes sessions by token and user', async () => {
        const session = buildSession({ userId: 'user-1', token: 'token-1' });
        await repository.save(session);

        await repository.delete('token-1');
        expect(await repository.findByToken('token-1')).toBeNull();

        await repository.save(buildSession({ userId: 'user-1' }));
        await repository.save(buildSession({ userId: 'user-1' }));
        await repository.deleteAllForUser('user-1');

        const remaining = await repository.findByUserId('user-1');
        expect(remaining).toHaveLength(0);
    });
});
