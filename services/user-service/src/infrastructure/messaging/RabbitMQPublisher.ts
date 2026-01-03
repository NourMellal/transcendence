import { createUserDeletedEvent } from '@transcendence/shared-messaging';
import type { UserEventsPublisher } from '../../domain/ports';
import { RabbitMQConnection } from './RabbitMQConnection';
import { EventSerializer } from './serialization/EventSerializer';

export class RabbitMQUserEventsPublisher implements UserEventsPublisher {
    constructor(
        private readonly connection: RabbitMQConnection,
        private readonly serializer: EventSerializer,
        private readonly exchange: string
    ) {}

    async publishUserDeleted(event: {
        readonly userId: string;
        readonly deletedAt: Date;
        readonly reason?: string;
        readonly initiatedBy: string;
    }): Promise<void> {
        const integrationEvent = createUserDeletedEvent({
            userId: event.userId,
            deletedAt: event.deletedAt,
            reason: event.reason,
        }, event.initiatedBy);

        const channel = await this.connection.getChannel();
        const buffer = this.serializer.serialize(integrationEvent);

        channel.publish(this.exchange, 'user.deleted', buffer, {
            contentType: 'application/json',
            persistent: true,
        });
    }
}
