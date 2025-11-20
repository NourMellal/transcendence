import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Database } from 'sqlite';
import { randomUUID } from 'crypto';
import { SQLiteFriendshipRepository } from '../../../../src/infrastructure/database/repositories/sqlite-friendship.repository';
import { createTestDatabase, closeTestDatabase } from '../../../helpers/test-database';
import { FriendshipDomain, FriendshipStatus } from '../../../../src/domain/entities/friendship.entity';

describe('SQLiteFriendshipRepository (integration)', () => {
    let db: Database | null = null;
    let repository: SQLiteFriendshipRepository;

    beforeEach(async () => {
        db = await createTestDatabase();
        repository = new SQLiteFriendshipRepository();
        await repository.initialize(':memory:', db);
    });

    afterEach(async () => {
        if (db) {
            await closeTestDatabase(db);
            db = null;
        }
    });

    const createRequest = (requesterId = randomUUID(), addresseeId = randomUUID()) =>
        FriendshipDomain.createRequest(requesterId, addresseeId);

    it('saves and finds friendships between users', async () => {
        const friendship = createRequest('userA', 'userB');
        await repository.save(friendship);

        const found = await repository.findBetweenUsers('userA', 'userB');
        expect(found).not.toBeNull();
        expect(found?.status).toBe(FriendshipStatus.PENDING);
    });

    it('lists friendships with optional statuses', async () => {
        const accepted = FriendshipDomain.transition(createRequest('userA', 'userC'), { type: 'ACCEPT' });
        await repository.save(createRequest('userA', 'userB'));
        await repository.save(accepted);

        const all = await repository.listForUser('userA');
        expect(all).toHaveLength(2);

        const acceptedOnly = await repository.listForUser('userA', [FriendshipStatus.ACCEPTED]);
        expect(acceptedOnly).toHaveLength(1);
        expect(acceptedOnly[0].status).toBe(FriendshipStatus.ACCEPTED);
    });

    it('updates and deletes friendships', async () => {
        const friendship = createRequest('userX', 'userY');
        await repository.save(friendship);

        await repository.update(friendship.id, {
            status: FriendshipStatus.ACCEPTED,
            respondedAt: new Date(),
        });

        const updated = await repository.findById(friendship.id);
        expect(updated?.status).toBe(FriendshipStatus.ACCEPTED);

        await repository.delete(friendship.id);
        expect(await repository.findById(friendship.id)).toBeNull();
    });

    it('deletes all friendships for a user', async () => {
        await repository.save(createRequest('userZ', 'user1'));
        await repository.save(createRequest('user2', 'userZ'));
        await repository.save(createRequest('user3', 'user4'));

        await repository.deleteAllForUser('userZ');

        expect(await repository.listForUser('userZ')).toHaveLength(0);
    });
});
