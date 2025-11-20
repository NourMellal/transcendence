import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SQLiteUserRepository } from '../../../../src/infrastructure/database/repositories/sqlite-user.repository';
import { createTestDatabase, closeTestDatabase } from '../../../helpers/test-database';
import { createUser } from '../../../../src/domain/entities/user.entity';
import { Email, Username, UserId, DisplayName } from '../../../../src/domain/value-objects';
import { Database } from 'sqlite';
import { randomUUID } from 'crypto';

describe('SQLiteUserRepository (integration)', () => {
    let db: Database | null = null;
    let repository: SQLiteUserRepository;

    beforeEach(async () => {
        db = await createTestDatabase();
        repository = new SQLiteUserRepository();
        await repository.initialize(':memory:', db);
    });

    afterEach(async () => {
        if (db) {
            await closeTestDatabase(db);
            db = null;
        }
    });

    const buildUser = (overrides: Partial<ReturnType<typeof createUser>> = {}) =>
        createUser({
            id: overrides.id ?? new UserId(randomUUID()),
            email: overrides.email ?? new Email(`${randomUUID()}@example.com`),
            username: overrides.username ?? new Username(`user_${randomUUID().slice(0, 5)}`),
            displayName: overrides.displayName ?? new DisplayName('Test User'),
            passwordHash: overrides.passwordHash,
            oauthProvider: overrides.oauthProvider,
            oauthId: overrides.oauthId,
        });

    it('saves and retrieves a user', async () => {
        const user = buildUser();
        await repository.save(user);

        const found = await repository.findById(user.id.toString());

        expect(found).not.toBeNull();
        expect(found?.email.toString()).toBe(user.email.toString());
        expect(found?.username.toString()).toBe(user.username.toString());
    });

    it('finds user by email', async () => {
        const user = buildUser({ email: new Email('unique@example.com') });
        await repository.save(user);

        const found = await repository.findByEmail('unique@example.com');
        expect(found).not.toBeNull();
        expect(found?.id.toString()).toBe(user.id.toString());
    });

    it('updates user fields', async () => {
        const user = buildUser();
        await repository.save(user);

        await repository.update(user.id.toString(), {
            email: new Email('updated@example.com'),
            displayName: new DisplayName('Updated'),
        });

        const updated = await repository.findById(user.id.toString());
        expect(updated?.email.toString()).toBe('updated@example.com');
        expect(updated?.displayName.toString()).toBe('Updated');
    });

    it('deletes users', async () => {
        const user = buildUser();
        await repository.save(user);

        await repository.delete(user.id.toString());

        const found = await repository.findById(user.id.toString());
        expect(found).toBeNull();
    });
});
