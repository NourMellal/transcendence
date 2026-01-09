export interface MessagingConfig {
    readonly uri: string;
    readonly exchange: string;
    readonly queuePrefix: string;
    readonly readiness?: {
        readonly maxAttempts: number;
        readonly initialDelayMs: number;
        readonly maxDelayMs: number;
        readonly backoffMultiplier: number;
    };
}

const DEFAULT_MAX_ATTEMPTS = 10;
const DEFAULT_INITIAL_DELAY = 500;
const DEFAULT_MAX_DELAY = 5_000;
const DEFAULT_BACKOFF = 1.5;

function parseNumberEnv(envName: string, fallback: number): number {
    const raw = process.env[envName];
    if (!raw) {
        return fallback;
    }

    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function createMessagingConfig(): MessagingConfig {
    const uri =
        process.env.RABBITMQ_URL ??
        process.env.RABBITMQ_URI ??
        // Default matches docker-compose credentials and Docker DNS
        'amqp://transcendence:transcendence_dev@rabbitmq:5672';

    return {
        uri,
        exchange: process.env.RABBITMQ_EXCHANGE || 'transcendence.events',
        queuePrefix: process.env.RABBITMQ_QUEUE_PREFIX || 'game-service',
        readiness: {
            maxAttempts: parseNumberEnv('RABBITMQ_MAX_ATTEMPTS', DEFAULT_MAX_ATTEMPTS),
            initialDelayMs: parseNumberEnv('RABBITMQ_RETRY_DELAY_MS', DEFAULT_INITIAL_DELAY),
            maxDelayMs: parseNumberEnv('RABBITMQ_MAX_RETRY_DELAY_MS', DEFAULT_MAX_DELAY),
            backoffMultiplier: parseNumberEnv('RABBITMQ_BACKOFF_MULTIPLIER', DEFAULT_BACKOFF)
        }
    };
}
