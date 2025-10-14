import {Channel, Connection, ConsumeMessage} from 'amqplib';
import { MessagingConnection } from "./connection";
import { Exchange } from "../types/exchange.types";
import { deserialize } from "../utils/serialization";
import { BaseMessage } from "../types/message.types";

export type MessageHandler<T = any> = (message: BaseMessage<T>, originalMessage: ConsumeMessage) => Promise<void>;

export class MessageConsumer {
    private connection: MessagingConnection;

    constructor(connection?: MessagingConnection) {
        this.connection = connection || new MessagingConnection();
    }

    async subscribe<T>(
        exchange: Exchange,
        routingKey: string,
        queue: string,
        handler: MessageHandler<T>,
    ) : Promise<string> {
        try {
            const channel = await this.connection.connect();

            await channel.assertExchange(exchange.name, exchange.type, { durable: true });
            const  queueResult = await  channel.assertQueue(queue, { durable: true });
            await channel.bindQueue(queueResult.queue, exchange.name, routingKey);

            const consumerTag = await  channel.consume(queueResult.queue, async (msg) => {
                if (!msg)
                    return;

                try {
                    const parsedMessage = deserialize<BaseMessage<T>>(msg.content);
                    await  handler(parsedMessage, msg);
                    channel.ack(msg);
                } catch (error) {
                    console.error('Error processing message: ', error);
                    channel.nack(msg, false, false);
                }
            });

            return consumerTag.consumerTag;
        } catch (error) {
            console.error('Failed to subscribe to queue: ', error);
            throw error;
        }
    }

    async unsubscribe(consumerTag: string) : Promise<void> {
        const channel = await this.connection.connect();
        await channel.cancel(consumerTag);
    }
}