import { Channel, ConsumeMessage } from 'amqplib';
import {
    EventType,
    IntegrationEvent,
    UserDeletedIntegrationEvent,
} from '@transcendence/shared-messaging';
import { IGameRepository } from '../../../application/ports/repositories/IGameRepository';
import { EventSerializer } from '../serialization/EventSerializer';
import { GameStatus } from '../../../domain/value-objects';

export class UserEventHandler {
    constructor(
        private readonly channel: Channel,
        private readonly serializer: EventSerializer,
        private readonly gameRepository: IGameRepository
    ) {}

    async start(queue: string): Promise<void> {
        await this.channel.assertQueue(queue, { durable: true });
        await this.channel.bindQueue(queue, 'transcendence.events', 'user.*');
        await this.channel.consume(queue, (message) => this.handle(message), { noAck: false });
    }

    private async handle(message: ConsumeMessage | null): Promise<void> {
        if (!message) {
            return;
        }

        try {
            const event = this.serializer.deserialize<IntegrationEvent<unknown>>(message.content);

            if (event.metadata.eventType === EventType.USER_DELETED) {
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
            console.error('Failed to handle user event', error);
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

        for (const game of games) {
            if (game.status === GameStatus.FINISHED || game.status === GameStatus.CANCELLED) {
                continue;
            }

            game.removePlayer(event.payload.userId);
            game.cancel();
            await this.gameRepository.update(game);
        }
    }
}
