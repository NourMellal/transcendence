import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Database } from 'sqlite';
import { SQLitePresenceRepository } from '../../../../src/infrastructure/database/repositories/sqlite-presence.repository';
import { createTestDatabase, closeTestDatabase } from '../../../helpers/test-database';
import { PresenceStatus } from '../../../../src/domain/entities/presence.entity';

describe('SQLitePresenceRepository (integration)', () => {
    let db: Database | null = null;
    let repository: SQLitePresenceRepository;

    beforeEach(async () => {
        db = await createTestDatabase();
        repository = new SQLitePresenceRepository();
        await repository.initialize(':memory:', db);
    });

    afterEach(async () => {
        if (db) {
            await closeTestDatabase(db);
            db = null;
        }
    });

    it('upserts presence entries and retrieves them', async () => {
        await repository.upsert('user-1', PresenceStatus.ONLINE, new Date('2024-01-01T00:00:00Z'));

        const presence = await repository.findByUserId('user-1');
        expect(presence).toEqual({
            userId: 'user-1',
            status: PresenceStatus.ONLINE,
            lastSeenAt: new Date('2024-01-01T00:00:00.000Z'),
        });

        await repository.upsert('user-1', PresenceStatus.ONLINE, new Date('2024-01-02T00:00:00Z'));
        const updated = await repository.findByUserId('user-1');
        expect(updated?.lastSeenAt.toISOString()).toBe('2024-01-02T00:00:00.000Z');
    });

    it('marks user offline', async () => {
        await repository.markOffline('user-2', new Date('2024-01-03T00:00:00Z'));
        const presence = await repository.findByUserId('user-2');
        expect(presence?.status).toBe(PresenceStatus.OFFLINE);
    });
});
