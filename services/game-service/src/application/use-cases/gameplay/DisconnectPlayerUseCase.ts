import { IGameRepository } from '../../ports/repositories/IGameRepository';
import { GameNotFoundError } from '../../../domain/errors';
import { GameStatus } from '../../../domain/value-objects';

export class DisconnectPlayerUseCase {
    private readonly gracePeriodMs = 30000; // 30 second window for reconnection
    private pendingRemovalTimers = new Map<string, Map<string, NodeJS.Timeout>>();

    constructor(private readonly gameRepository: IGameRepository) {}

    async execute(gameId: string, playerId: string): Promise<void> {
        const game = await this.gameRepository.findById(gameId);
        if (!game) {
            throw new GameNotFoundError(gameId);
        }

        if (game.status === GameStatus.WAITING) {
            // In lobby: don't remove immediately, set a grace period for reconnection
            this.schedulePlayerRemoval(gameId, playerId);
        } else {
            // During play: only mark as disconnected so state/history are preserved
            game.disconnectPlayer(playerId);
            await this.gameRepository.update(game);
        }
    }

    /**
     * Cancel pending removal if player reconnects within grace period
     */
    async cancelRemovalIfPending(gameId: string, playerId: string): Promise<void> {
        const gameTimers = this.pendingRemovalTimers.get(gameId);
        if (!gameTimers) return;

        const timer = gameTimers.get(playerId);
        if (timer) {
            clearTimeout(timer);
            gameTimers.delete(playerId);
        }
    }

    private schedulePlayerRemoval(gameId: string, playerId: string): void {
        // Cancel existing timer for this player if any
        const gameTimers = this.pendingRemovalTimers.get(gameId) || new Map();
        const existingTimer = gameTimers.get(playerId);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        // Schedule removal after grace period
        const timer = setTimeout(async () => {
            try {
                const game = await this.gameRepository.findById(gameId);
                if (!game) return;

                game.removePlayer(playerId);
                if (game.players.length === 0) {
                    game.cancel();
                }
                await this.gameRepository.update(game);
            } catch (error) {
                console.error(`[DisconnectPlayerUseCase] Failed to remove player:`, error);
            } finally {
                gameTimers.delete(playerId);
            }
        }, this.gracePeriodMs);

        gameTimers.set(playerId, timer);
        this.pendingRemovalTimers.set(gameId, gameTimers);
    }
}
