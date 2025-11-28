import { describe, expect, it, vi } from 'vitest';
import type {
    FriendshipRepository,
    SessionRepository,
    UnitOfWork,
    User,
    UserEventsPublisher,
    UserPresenceRepository,
    UserRepository,
} from '../../services/user-service/src/domain/ports';
import { DeleteUserUseCase } from '../../services/user-service/src/application/use-cases/users/delete-user.usecase';
import { createUser } from '../../services/user-service/src/domain/entities/user.entity';
import { Email, DisplayName, Username, UserId } from '../../services/user-service/src/domain/value-objects';
import { createUserDeletedEvent } from '@transcendence/shared-messaging';
import { UserEventHandler } from '../../services/game-service/src/infrastructure/messaging/subscribers/UserEventHandler';
import { EventSerializer } from '../../services/game-service/src/infrastructure/messaging/serialization/EventSerializer';
import { Game } from '../../services/game-service/src/domain/entities';
import { GameStatus } from '../../services/game-service/src/domain/value-objects';
import type { Channel, ConsumeMessage } from 'amqplib';
import type { Session } from '../../services/user-service/src/domain/entities/user.entity';
import type { Friendship } from '../../services/user-service/src/domain/entities/friendship.entity';
import type { UserPresence } from '../../services/user-service/src/domain/entities/presence.entity';
import type { IGameRepository, ListGamesParams } from '../../services/game-service/src/application/ports/repositories/IGameRepository';

class InMemoryChannel implements Partial<Channel> {
    ack = vi.fn();
    nack = vi.fn();
}

class InMemoryUnitOfWork implements UnitOfWork {
    async withTransaction<T>(handler: () => Promise<T>): Promise<T> {
        return handler();
    }
}

class InMemoryUserRepository implements UserRepository {
    private users = new Map<string, User>();

    seed(user: User): void {
        this.users.set(user.id.toString(), user);
    }

    async findById(id: string): Promise<User | null> {
        return this.users.get(id) ?? null;
    }

    async findByEmail(): Promise<User | null> {
        return null;
    }

    async findByUsername(): Promise<User | null> {
        return null;
    }

    async save(user: User): Promise<void> {
        this.users.set(user.id.toString(), user);
    }

    async update(id: string, updates: Partial<User>): Promise<void> {
        const user = this.users.get(id);
        if (!user) {
            return;
        }
        Object.assign(user, updates);
    }

    async delete(id: string): Promise<void> {
        this.users.delete(id);
    }
}

class InMemorySessionRepository implements SessionRepository {
    async findByToken(): Promise<Session | null> {
        return null;
    }
    async findByUserId(): Promise<Session[]> {
        return [];
    }
    async save(): Promise<void> {
        return;
    }
    async delete(): Promise<void> {
        return;
    }
    async deleteAllForUser(): Promise<void> {
        return;
    }
}

class InMemoryFriendshipRepository implements FriendshipRepository {
    async findById(): Promise<Friendship | null> {
        return null;
    }
    async findBetweenUsers(): Promise<Friendship | null> {
        return null;
    }
    async listForUser(): Promise<Friendship[]> {
        return [];
    }
    async listPendingForUser(): Promise<Friendship[]> {
        return [];
    }
    async save(): Promise<void> {
        return;
    }
    async update(): Promise<void> {
        return;
    }
    async delete(): Promise<void> {
        return;
    }
    async deleteAllForUser(): Promise<void> {
        return;
    }
}

class InMemoryPresenceRepository implements UserPresenceRepository {
    async upsert(): Promise<void> {
        return;
    }
    async findByUserId(): Promise<UserPresence | null> {
        return null;
    }
    async markOffline(): Promise<void> {
        return;
    }
}

class InMemoryGameRepository implements IGameRepository {
    constructor(public games: Game[] = []) {}

    async list(params?: ListGamesParams): Promise<Game[]> {
        if (!params?.playerId) {
            return [...this.games];
        }
        return this.games.filter((game) => game.players.some((player) => player.id === params.playerId));
    }

    async update(game: Game): Promise<void> {
        const idx = this.games.findIndex((g) => g.id === game.id);
        if (idx >= 0) {
            this.games[idx] = game;
        }
    }

    async create(game: Game): Promise<void> {
        this.games.push(game);
    }

    async findById(id: string): Promise<Game | null> {
        return this.games.find((game) => game.id === id) ?? null;
    }

    async findActiveByPlayer(playerId: string): Promise<Game | null> {
        return (
            this.games.find(
                (game) =>
                    game.players.some((player) => player.id === playerId) &&
                    game.status !== GameStatus.CANCELLED &&
                    game.status !== GameStatus.FINISHED
            ) ?? null
        );
    }
}

describe('Cross-service integration: user deletion cancels games', () => {
    it('deletes user, emits event, and cancels active game', async () => {
        const userId = 'user-flow-1';
        const opponentId = 'user-opponent';
        const user = createUser({
            id: new UserId(userId),
            email: new Email('flow@example.com'),
            username: new Username('flow_user'),
            displayName: new DisplayName('Flow User'),
            passwordHash: 'hash',
        });

        const userRepository = new InMemoryUserRepository();
        userRepository.seed(user);
        const sessionRepository = new InMemorySessionRepository();
        const friendshipRepository = new InMemoryFriendshipRepository();
        const presenceRepository = new InMemoryPresenceRepository();
        const unitOfWork = new InMemoryUnitOfWork();

        const serializer = new EventSerializer();
        const channel = new InMemoryChannel();
        const gameRepository = new InMemoryGameRepository();
        const notifier = { emitToGame: vi.fn() };
        const handler = new UserEventHandler(channel as Channel, serializer, gameRepository, notifier);

        const publisher: UserEventsPublisher = {
            publishUserDeleted: async ({ userId: deletedUserId, deletedAt, reason }) => {
                const event = createUserDeletedEvent({ userId: deletedUserId, deletedAt, reason });
                const message = {
                    content: serializer.serialize(event),
                    fields: {} as ConsumeMessage['fields'],
                    properties: {} as ConsumeMessage['properties'],
                } as ConsumeMessage;
                // @ts-expect-error accessing private method for integration verification
                await handler.handle(message);
            },
        };

        const deleteUserUseCase = new DeleteUserUseCase(
            userRepository,
            sessionRepository,
            friendshipRepository,
            presenceRepository,
            unitOfWork,
            publisher
        );

        const game = Game.create({ playerId: userId, opponentId, mode: 'CLASSIC', config: {} });
        game.start();
        gameRepository.games.push(game);

        const result = await deleteUserUseCase.execute({ userId, initiatedBy: userId, reason: 'user_request' });

        expect(result).toEqual({ success: true });
        expect(await userRepository.findById(userId)).toBeNull();
        expect(gameRepository.games[0].status).toBe(GameStatus.CANCELLED);
        expect(notifier.emitToGame).toHaveBeenCalledWith(game.id, 'game:cancelled', expect.objectContaining({
            gameId: game.id,
            opponentId,
            reason: 'opponent_deleted',
        }));
    });
});
