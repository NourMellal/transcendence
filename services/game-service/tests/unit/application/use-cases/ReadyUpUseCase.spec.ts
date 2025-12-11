import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReadyUpUseCase } from '../../../../src/application/use-cases';
import { IGameRepository, ListGamesParams } from '../../../../src/application/ports/repositories/IGameRepository';
import { Game } from '../../../../src/domain/entities';
import { GameStatus } from '../../../../src/domain/value-objects';
import { IGameEventPublisher } from '../../../../src/application/ports/messaging/IGameEventPublisher';

class InMemoryGameRepository implements IGameRepository {
    private games = new Map<string, Game>();

    constructor(initialGame?: Game) {
        if (initialGame) {
            this.games.set(initialGame.id, initialGame);
        }
    }

    async create(game: Game): Promise<void> {
        this.games.set(game.id, game);
    }

    async update(game: Game): Promise<void> {
        this.games.set(game.id, game);
    }

    async findById(id: string): Promise<Game | null> {
        return this.games.get(id) ?? null;
    }

    // Unused in these tests
    async list(_params?: ListGamesParams): Promise<Game[]> {
        return Array.from(this.games.values());
    }

    async findActiveByPlayer(playerId: string): Promise<Game | null> {
        for (const game of this.games.values()) {
            if (game.players.some((player) => player.id === playerId)) {
                return game;
            }
        }
        return null;
    }
}

class NoopEventPublisher implements IGameEventPublisher {
    publishGameCreated = vi.fn();
    publishGameStarted = vi.fn();
    publishGameFinished = vi.fn();
    publishGameCancelled = vi.fn();
    publishGameStateUpdated = vi.fn();
}

describe('ReadyUpUseCase', () => {
    let repository: InMemoryGameRepository;
    let publisher: NoopEventPublisher;
    let useCase: ReadyUpUseCase;
    let game: Game;

    beforeEach(() => {
        game = Game.create({
            playerId: 'p1',
            opponentId: 'p2',
            mode: 'CLASSIC',
            config: {},
        });
        repository = new InMemoryGameRepository(game);
        publisher = new NoopEventPublisher();
        useCase = new ReadyUpUseCase(repository, publisher);
    });

    it('marks a player ready but does not start when only one player is ready', async () => {
        const result = await useCase.execute(game.id, 'p1');

        const updated = await repository.findById(game.id);
        expect(result.started).toBe(false);
        expect(updated?.players.find((p) => p.id === 'p1')?.ready).toBe(true);
        expect(updated?.status).toBe(GameStatus.WAITING);
        expect(publisher.publishGameStarted).not.toHaveBeenCalled();
    });

    it('starts the game and publishes when all players are ready', async () => {
        await useCase.execute(game.id, 'p1');
        const result = await useCase.execute(game.id, 'p2');

        const updated = await repository.findById(game.id);
        expect(result.started).toBe(true);
        expect(updated?.status).toBe(GameStatus.IN_PROGRESS);
        expect(publisher.publishGameStarted).toHaveBeenCalledTimes(1);
    });

    it('throws if non participant tries to ready up', async () => {
        await expect(useCase.execute(game.id, 'intruder')).rejects.toThrow();
    });
});
