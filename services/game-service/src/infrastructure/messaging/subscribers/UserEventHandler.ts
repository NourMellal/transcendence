import { Channel, ConsumeMessage } from 'amqplib';

export class UserEventHandler {
    constructor(private readonly channel: Channel) {}

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
            // TODO: hydrate caches or validate player state
            this.channel.ack(message);
        } catch (error) {
            this.channel.nack(message, false, false);
            console.error('Failed to handle user event', error);
        }
    }
}
