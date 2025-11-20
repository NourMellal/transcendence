export interface MessagingConfig {
    readonly uri: string;
    readonly exchange: string;
    readonly queuePrefix: string;
}

export function createMessagingConfig(): MessagingConfig {
    return {
        uri: process.env.RABBITMQ_URI || 'amqp://guest:guest@rabbitmq:5672',
        exchange: process.env.RABBITMQ_EXCHANGE || 'transcendence.events',
        queuePrefix: process.env.RABBITMQ_QUEUE_PREFIX || 'game-service'
    };
}
