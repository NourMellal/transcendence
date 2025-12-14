export interface MessagingConfig {
    readonly uri: string;
    readonly exchange: string;
    readonly queuePrefix: string;
}

export function createMessagingConfig(): MessagingConfig {
    const uri =
        process.env.RABBITMQ_URL ??
        process.env.RABBITMQ_URI ??
        // Default matches docker-compose credentials and works for local host access to the container port
        'amqp://transcendence:transcendence_dev@localhost:5672';

    return {
        uri,
        exchange: process.env.RABBITMQ_EXCHANGE || 'transcendence.events',
        queuePrefix: process.env.RABBITMQ_QUEUE_PREFIX || 'chat-service'
    };
}
