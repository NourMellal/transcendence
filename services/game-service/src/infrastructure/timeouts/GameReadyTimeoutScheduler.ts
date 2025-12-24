import { IGameReadyTimeoutScheduler } from '../../application/ports/timeouts';
import { ForfeitGameUseCase } from '../../application/use-cases';
import { logger } from '../config/logger';

const DEFAULT_READY_TIMEOUT_MS = 30000;

export class GameReadyTimeoutScheduler implements IGameReadyTimeoutScheduler {
    private readonly timers = new Map<string, NodeJS.Timeout>();

    constructor(
        private readonly forfeitGame: ForfeitGameUseCase,
        private readonly timeoutMs: number = DEFAULT_READY_TIMEOUT_MS
    ) {}

    schedule(gameId: string): void {
        if (this.timers.has(gameId)) {
            return;
        }

        const timer = setTimeout(async () => {
            this.timers.delete(gameId);
            try {
                await this.forfeitGame.execute(gameId);
            } catch (error) {
                logger.warn({ err: error, gameId }, '[GameReadyTimeoutScheduler] Forfeit failed');
            }
        }, this.timeoutMs);

        this.timers.set(gameId, timer);
    }

    cancel(gameId: string): void {
        const timer = this.timers.get(gameId);
        if (!timer) {
            return;
        }

        clearTimeout(timer);
        this.timers.delete(gameId);
    }
}
