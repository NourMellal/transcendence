import { describe, it, expect } from 'vitest';
import { CreateGameUseCase } from '../../../../src/application/use-cases/game-management/CreateGameUseCase';
import { IGameRepository } from '../../../../src/application/ports/repositories/IGameRepository';
import { Game } from '../../../../src/domain/entities';
import { IGameEventPublisher } from '../../../../src/application/ports/messaging/IGameEventPublisher';
import { IUserServiceClient } from '../../../../src/application/ports/external/IUserServiceClient';
import { InvalidGameStateError } from '../../../../src/domain/errors';

class InMemoryRepo implements IGameRepository {
    private games = new Map<string, Game>();

    async create(game: Game): Promise<void> {
        this.games.set(game.id, game);
    }

    async update(game: Game): Promise<void> {
        this.games.set(game.id, game);
    }

    async findById(id: string): Promise<Game | null> {
        return this.games.get(id) ?? null;
    }

  async list(_params?: any): Promise<Game[]> {
        return [...this.games.values()];
    }

    async findActiveByPlayer(playerId: string): Promise<Game | null> {
        return [...this.games.values()].find((game) => game.players.some((p) => p.id === playerId)) ?? null;
    }
}

class FakePublisher implements IGameEventPublisher {
    events: string[] = [];
    async publishGameCreated(game: Game): Promise<void> {
        this.events.push(`created:${game.id}`);
    }
    async publishGameStarted(): Promise<void> {}
    async publishGameFinished(): Promise<void> {}
}

class FakeUserClient implements IUserServiceClient {
    constructor(private readonly missingUsers: Set<string> = new Set()) {}

    async getUserSummary(userId: string) {
        if (this.missingUsers.has(userId)) {
            return null;
        }
        return { id: userId, username: `user-${userId}` } as any;
    }

    async ensureUsersExist(userIds: string[]): Promise<void> {
        const missing = userIds.filter((id) => this.missingUsers.has(id));
        if (missing.length > 0) {
            throw new InvalidGameStateError(`Missing users: ${missing.join(', ')}`);
        }
    }
}

describe('CreateGameUseCase', () => {
    it('creates a game and publishes event', async () => {
        const repo = new InMemoryRepo();
        const publisher = new FakePublisher();
        const userClient = new FakeUserClient();
        const useCase = new CreateGameUseCase(repo, publisher, userClient);

        const result = await useCase.execute({ playerId: 'player1', mode: 'classic', config: {} });

        expect(result.id).toBeDefined();
        expect(publisher.events.length).toBe(1);
    });

    it('throws when provided players do not exist', async () => {
        const repo = new InMemoryRepo();
        const publisher = new FakePublisher();
        const userClient = new FakeUserClient(new Set(['ghost']));
        const useCase = new CreateGameUseCase(repo, publisher, userClient);

        await expect(
            useCase.execute({
                playerId: 'player1',
                opponentId: 'ghost',
                mode: 'classic',
                config: {}
            })
        ).rejects.toBeInstanceOf(InvalidGameStateError);
    });
});
