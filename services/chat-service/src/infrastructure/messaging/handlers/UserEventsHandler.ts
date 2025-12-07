import { Channel, ConsumeMessage } from 'amqplib';
import {
    EventType,
    IntegrationEvent,
    UserDeletedIntegrationEvent,
} from '@transcendence/shared-messaging';
import { logger } from '../../config/logger';

export class UserEventsHandler {
    private channel?: Channel;

    async start(queue: string, exchange: string): Promise<void> {
        if (!this.channel) {
            throw new Error('Channel not initialized. Call setChannel() first.');
        }

        await this.channel.assertQueue(queue, { durable: true });
        await this.channel.bindQueue(queue, exchange, 'user.*');
        await this.channel.consume(queue, (message) => this.handle(message), { noAck: false });
        
        logger.info(`📨 Listening for user events on queue: ${queue}`);
    }

    setChannel(channel: Channel): void {
        this.channel = channel;
    }

    private async handle(message: ConsumeMessage | null): Promise<void> {
        if (!message || !this.channel) {
            return;
        }

        try {
            const event = JSON.parse(message.content.toString()) as IntegrationEvent<unknown>;

            if (event.metadata.eventType === EventType.USER_DELETED) {
                logger.info('[UserEventsHandler] Received user.deleted event', {
                    eventId: event.metadata.eventId,
                    userId: (event.payload as any)?.userId,
                });

                const parsed = this.parseUserDeletedEvent(event.payload);
                if (!parsed) {
                    this.channel.nack(message, false, false);
                    return;
                }

                await this.handleUserDeleted(parsed);
            }

            this.channel.ack(message);
        } catch (error) {
            if (this.channel) {
                this.channel.nack(message, false, false);
            }
            logger.error('[UserEventsHandler] Failed to handle user event', error);
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

    private async handleUserDeleted(payload: UserDeletedIntegrationEvent['payload']): Promise<void> {
        logger.info('[UserEventsHandler] Handling user deletion', {
            userId: payload.userId,
            deletedAt: payload.deletedAt,
        });

    }
}
