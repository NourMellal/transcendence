import {Channel, Message} from "amqplib";
import { MessagingConnection } from "./connection";
import { Exchange } from "../types/exchange.types";
import { BaseMessage, MessageOptions } from "../types/message.types";
import { serialize } from "../utils/serialization";

export class MessagePublisher {
    private connection: MessagingConnection;

    constructor(connection?: MessagingConnection) {
        this.connection = connection || new MessagingConnection();
    }

    async publish<T>(
        exchange: Exchange,
        routingKey: string,
        message: BaseMessage<T>,
        options: MessageOptions = {}
    ) : Promise<boolean> {
        try {
            const channel = await this.connection.connect();

            await this.assertExchange(channel, exchange);

            const content = serialize(message);
            const publishOptions = {
                persistent: options.persistent ?? true,
                expiration: options.expiration,
                priority: options.priority,
                headers: options.headers,
                contentType: 'application/json',
                contentEncoding: 'utf8',
                correlationId: message.correlationId,
                messageId: message.id,
                timestamp: message.timestamp ? Math.floor(message.timestamp.getTime() / 1000) : undefined,
            };

            return channel.publish(
                exchange.name,
                routingKey,
                content,
                publishOptions
            );
        } catch (error) {
            console.error(`Failed to publish message ${routingKey}, ${exchange.name}`, error);
            throw error;
        }
    }

    private async assertExchange(channel: Channel, exchange: Exchange): Promise<void> {
        await channel.assertExchange(exchange.name, exchange.type, {
            durable: true,
            autoDelete: false,
        });
    }
}