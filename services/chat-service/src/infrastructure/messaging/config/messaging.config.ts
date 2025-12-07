import { getEnvVar } from '@transcendence/shared-utils';

export interface MessagingConfig {
    readonly uri: string;
    readonly exchange: string;
    readonly queuePrefix: string;
}

export function createMessagingConfig(): MessagingConfig {
    return {
        uri: getEnvVar('RABBITMQ_URL', 'amqp://transcendence:transcendence_dev@localhost:5672'),
        exchange: getEnvVar('RABBITMQ_EXCHANGE', 'transcendence'),
        queuePrefix: 'chat-service'
    };
}
