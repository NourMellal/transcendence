import { Channel, ConsumeMessage } from 'amqplib';
import {
    EventType,
    IntegrationEvent,
    UserDeletedIntegrationEvent,
} from '@transcendence/shared-messaging';
import { IGameRepository } from '../../../application/ports/repositories/IGameRepository';
import { EventSerializer } from '../serialization/EventSerializer';
import { GameStatus } from '../../../domain/value-objects';
import { logger } from '../../config/logger';
import { PublicGameLobbyNotifier } from '../../websocket';

export interface GameRoomNotifier {
    emitToGame(gameId: string, event: string, payload: unknown): void;
}

export class UserEventHandler {
    constructor(
        private readonly channel: Channel,
        private readonly serializer: EventSerializer,
        private readonly gameRepository: IGameRepository,
        private readonly notifier?: GameRoomNotifier,
        private readonly lobbyNotifier?: PublicGameLobbyNotifier
    ) {}

    async start(queue: string, exchange: string): Promise<void> {
        await this.channel.assertQueue(queue, { durable: true });
        await this.channel.bindQueue(queue, exchange, 'user.*');
        await this.channel.consume(queue, (message) => this.handle(message), { noAck: false });
    }

    private async handle(message: ConsumeMessage | null): Promise<void> {
        if (!message) {
            return;
        }

        try {
            const event = this.serializer.deserialize<IntegrationEvent<unknown>>(message.content);

            if (event.metadata.eventType === EventType.USER_DELETED) {
                logger.info('[UserEventHandler] Received user.deleted event', {
                    eventId: event.metadata.eventId,
                    userId: (event.payload as any)?.userId,
                });
                const parsed = this.parseUserDeletedEvent(event.payload);
                if (!parsed) {
                    this.channel.nack(message, false, false);
                    return;
                }

                await this.cleanUpUserGames({ ...event, payload: parsed });
            }

            this.channel.ack(message);
        } catch (error) {
            this.channel.nack(message, false, false);
            logger.error('[UserEventHandler] Failed to handle user event', error);
        }
    }

    private parseUserDeletedEvent(payload: unknown): UserDeletedIntegrationEvent['payload'] | null {
        if (!payload || typeof payload !== 'object') {
            return null;
        }

        const { userId, deletedAt, reason } = payload as Record<string, unknown>;

        if (typeof userId !== 'string') {
            return null;
        }

        const parsedDeletedAt = new Date(deletedAt as string | number | Date);
        if (Number.isNaN(parsedDeletedAt.getTime())) {
            return null;
        }

        return {
            userId,
            deletedAt: parsedDeletedAt,
            reason: typeof reason === 'string' ? reason : undefined,
        };
    }

    private async cleanUpUserGames(event: UserDeletedIntegrationEvent): Promise<void> {
        const games = await this.gameRepository.list({ playerId: event.payload.userId });
        logger.info('[UserEventHandler] Cancelling active games for deleted user', {
            userId: event.payload.userId,
            totalGames: games.length,
        });

        const deletedPlayerId = event.payload.userId;

        for (const game of games) {
            if (game.status === GameStatus.FINISHED || game.status === GameStatus.CANCELLED) {
                continue;
            }

            game.removePlayer(deletedPlayerId);
            game.cancel();
            await this.gameRepository.update(game);
            const remainingPlayer = game.players.find((player) => player.id !== deletedPlayerId);
            if (remainingPlayer) {
                this.notifier?.emitToGame(game.id, 'game:cancelled', {
                    gameId: game.id,
                    opponentId: deletedPlayerId,
                    reason: 'opponent_deleted',
                    message: 'Opponent account was deleted. This match has been cancelled.',
                });
            }
            logger.info('[UserEventHandler] Cancelled game due to user deletion', {
                gameId: game.id,
                userId: deletedPlayerId,
            });
        }

        await this.lobbyNotifier?.broadcastSnapshot();
    }
}
