import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SQLiteUserRepository } from '../../../../src/infrastructure/database/repositories/sqlite-user.repository';
import { SQLiteSessionRepository } from '../../../../src/infrastructure/database/repositories/sqlite-session.repository';
import { SQLiteFriendshipRepository } from '../../../../src/infrastructure/database/repositories/sqlite-friendship.repository';
import { SQLitePresenceRepository } from '../../../../src/infrastructure/database/repositories/sqlite-presence.repository';
import { SQLiteUnitOfWork } from '../../../../src/infrastructure/database/sqlite-unit-of-work';
import { DeleteUserUseCase } from '../../../../src/application/use-cases/users/delete-user.usecase';
import type { UserEventsPublisher } from '../../../../src/domain/ports';
import { createTestDatabase, closeTestDatabase } from '../../../helpers/test-database';
import type { Database } from 'sqlite';
import { createTestUser } from '../../../helpers/entity-factories';
import { UserId } from '../../../../src/domain/value-objects';

describe('DeleteUserUseCase integration (events)', () => {
    let db: Database | null = null;
    let userRepository: SQLiteUserRepository;
    let sessionRepository: SQLiteSessionRepository;
    let friendshipRepository: SQLiteFriendshipRepository;
    let presenceRepository: SQLitePresenceRepository;
    let unitOfWork: SQLiteUnitOfWork;

    beforeEach(async () => {
        db = await createTestDatabase();
        userRepository = new SQLiteUserRepository();
        await userRepository.initialize(':memory:', db);
        sessionRepository = new SQLiteSessionRepository();
        await sessionRepository.initialize(':memory:', db);
        friendshipRepository = new SQLiteFriendshipRepository();
        await friendshipRepository.initialize(':memory:', db);
        presenceRepository = new SQLitePresenceRepository();
        await presenceRepository.initialize(':memory:', db);
        unitOfWork = new SQLiteUnitOfWork(db);
    });

    afterEach(async () => {
        if (db) {
            await closeTestDatabase(db);
            db = null;
        }
    });

    const buildUseCase = (publisher: UserEventsPublisher) =>
        new DeleteUserUseCase(
            userRepository,
            sessionRepository,
            friendshipRepository,
            presenceRepository,
            unitOfWork,
            publisher
        );

    it('emits user.deleted event after successful deletion', async () => {
        const publisher: UserEventsPublisher = {
            publishUserDeleted: vi.fn().mockResolvedValue(undefined),
        };
        const useCase = buildUseCase(publisher);
        const user = createTestUser({ id: new UserId('user-integration-1') });
        await userRepository.save(user);

        const result = await useCase.execute({
            userId: user.id.toString(),
            initiatedBy: 'user-integration-1',
            reason: 'user_request',
        });

        expect(result).toEqual({ success: true });
        expect(await userRepository.findById(user.id.toString())).toBeNull();
        expect(publisher.publishUserDeleted).toHaveBeenCalledTimes(1);
        expect(publisher.publishUserDeleted).toHaveBeenCalledWith({
            userId: user.id.toString(),
            deletedAt: expect.any(Date),
            reason: 'user_request',
            initiatedBy: 'user-integration-1',
        });
    });

    it('logs but does not fail when event publishing throws', async () => {
        const publisher: UserEventsPublisher = {
            publishUserDeleted: vi.fn().mockRejectedValue(new Error('broker down')),
        };
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const useCase = buildUseCase(publisher);
        const user = createTestUser({ id: new UserId('user-integration-2') });
        await userRepository.save(user);

        await expect(
            useCase.execute({
                userId: user.id.toString(),
                initiatedBy: 'user-integration-2',
            })
        ).resolves.toEqual({ success: true });

        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });
});
