import * as process from "node:process";

export interface RabbitMQConfig {
    url: string;
    reconnectTimeout: number;
    maxReconnectAttempts: number;
}

export const defaultConfig: RabbitMQConfig = {
    url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
    reconnectTimeout: 5000,
    maxReconnectAttempts: 10,
};