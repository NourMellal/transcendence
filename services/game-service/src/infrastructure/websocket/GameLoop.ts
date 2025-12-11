import { UpdateGameStateUseCase } from '../../application/use-cases';
import { GameStatus } from '../../domain/value-objects';

export class GameLoop {
    private readonly loops = new Map<string, NodeJS.Timeout>();

    constructor(
        private readonly updateGameStateUseCase: UpdateGameStateUseCase,
        private readonly tickIntervalMs = 16
    ) {}

    start(gameId: string): void {
        if (this.loops.has(gameId)) {
            return;
        }

        const interval = setInterval(async () => {
            try {
                const result = await this.updateGameStateUseCase.execute(gameId, this.tickIntervalMs / 1000);

                if (result.status === GameStatus.FINISHED || result.status === GameStatus.CANCELLED) {
                    this.stop(gameId);
                }
            } catch (error) {
                console.error('Game loop tick failed', { gameId, error });
            }
        }, this.tickIntervalMs);

        this.loops.set(gameId, interval);
    }

    stop(gameId: string): void {
        const interval = this.loops.get(gameId);
        if (interval) {
            clearInterval(interval);
            this.loops.delete(gameId);
        }
    }
}
