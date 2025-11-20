import { describe, it, expect } from 'vitest';
import { FinishGameUseCase } from '../../../../src/application/use-cases/game-management/FinishGameUseCase';
import { IGameRepository } from '../../../../src/application/ports/repositories/IGameRepository';
import { Game } from '../../../../src/domain/entities';
import { GameStatus } from '../../../../src/domain/value-objects/GameStatus';
import { IGameEventPublisher } from '../../../../src/application/ports/messaging/IGameEventPublisher';

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
    async list(): Promise<Game[]> {
        return [...this.games.values()];
    }
    async findActiveByPlayer(): Promise<Game | null> {
        return null;
    }
}

class FakePublisher implements IGameEventPublisher {
    published = 0;
    async publishGameCreated(): Promise<void> {}
    async publishGameStarted(): Promise<void> {}
    async publishGameFinished(): Promise<void> {
        this.published += 1;
    }
}

describe('FinishGameUseCase', () => {
    it('marks a game as finished', async () => {
        const repo = new InMemoryRepo();
        const publisher = new FakePublisher();
        const useCase = new FinishGameUseCase(repo, publisher);
        const game = Game.create({ playerId: 'player1', opponentId: 'player2', mode: 'classic', config: {} });
        game.start();
        await repo.create(game);

        await useCase.execute({ gameId: game.id, winnerId: 'player1' });

        const stored = await repo.findById(game.id);
        expect(stored?.status).toBe(GameStatus.FINISHED);
        expect(publisher.published).toBe(1);
    });
});
