import { Game } from '../../domain/entities';
import { GameStatus } from '../../domain/value-objects';
import { IGameRepository } from '../../application/ports/repositories/IGameRepository';
import { IUserServiceClient } from '../../application/ports/external';
import { GameRoomManager } from './GameRoomManager';
import { logger } from '../config/logger';

interface LobbyGameSummary {
    readonly gameId: string;
    readonly creatorId?: string;
    readonly creatorUsername?: string;
    readonly gameType: string;
    readonly createdAt: string;
    readonly playersWaiting: number;
}

export class PublicGameLobbyNotifier {
    private readonly usernameCache = new Map<string, string>();

    constructor(
        private readonly roomManager: GameRoomManager,
        private readonly gameRepository: IGameRepository,
        private readonly userServiceClient: IUserServiceClient
    ) {}

    async broadcastSnapshot(): Promise<void> {
        try {
            const games = await this.gameRepository.list({ status: GameStatus.WAITING });
            const joinableGames = games.filter((game) => game.players.length < 2);
            const summaries = await Promise.all(joinableGames.map((game) => this.toSummary(game)));
            this.roomManager.broadcast('game:lobby:updated', {
                games: summaries
            });
        } catch (error) {
            logger.error('[PublicGameLobbyNotifier] Failed to broadcast lobby snapshot', error);
        }
    }

    private async toSummary(game: Game): Promise<LobbyGameSummary> {
        const creator = game.players[0];
        const creatorUsername = await this.resolveUsername(creator?.id);

        return {
            gameId: game.id,
            creatorId: creator?.id,
            creatorUsername,
            gameType: game.mode,
            createdAt: game.createdAt.toISOString(),
            playersWaiting: game.players.length
        };
    }

    private async resolveUsername(userId?: string): Promise<string | undefined> {
        if (!userId) {
            return undefined;
        }

        const cached = this.usernameCache.get(userId);
        if (cached) {
            return cached;
        }

        try {
            const summary = await this.userServiceClient.getUserSummary(userId);
            if (summary?.username) {
                this.usernameCache.set(userId, summary.username);
                return summary.username;
            }
        } catch (error) {
            logger.warn('[PublicGameLobbyNotifier] Failed to resolve username', { userId, error });
        }

        return undefined;
    }
}
