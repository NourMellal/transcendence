import amqplib, { type Channel, type Connection } from 'amqplib';

export interface RabbitMQLogger {
    info?(message: string, context?: Record<string, unknown>): void;
    warn?(message: string, context?: Record<string, unknown>): void;
    error?(message: string, context?: Record<string, unknown>): void;
}

export interface RabbitMQReadinessConfig {
    readonly maxAttempts?: number;
    readonly initialDelayMs?: number;
    readonly maxDelayMs?: number;
    readonly backoffMultiplier?: number;
}

export interface RabbitMQConnectionConfig {
    readonly uri: string;
    readonly exchange: string;
    readonly readiness?: RabbitMQReadinessConfig;
    readonly logger?: RabbitMQLogger;
}

const DEFAULT_READINESS: Required<RabbitMQReadinessConfig> = {
    maxAttempts: 10,
    initialDelayMs: 500,
    maxDelayMs: 5_000,
    backoffMultiplier: 1.5
};

export class RabbitMQConnection {
    private connection?: Connection;
    private channel?: Channel;
    private channelPromise?: Promise<Channel>;
    private readonly logger: RabbitMQLogger;

    constructor(private readonly config: RabbitMQConnectionConfig) {
        this.logger = config.logger ?? console;
    }

    async waitForReadiness(): Promise<void> {
        await this.getChannel();
    }

    async getChannel(): Promise<Channel> {
        if (!this.channelPromise) {
            this.channelPromise = this.connectWithRetry();
        }

        return this.channelPromise;
    }

    async close(): Promise<void> {
        await this.safeClose();
        this.channelPromise = undefined;
    }

    private async connectWithRetry(): Promise<Channel> {
        const readiness = { ...DEFAULT_READINESS, ...this.config.readiness };
        let attempt = 0;
        let delayMs = readiness.initialDelayMs;
        let lastError: unknown;

        while (attempt < readiness.maxAttempts) {
            attempt++;
            let tempConnection: Connection | undefined;
            let tempChannel: Channel | undefined;
            try {
                this.logger.info?.('Attempting RabbitMQ connection', {
                    attempt,
                    maxAttempts: readiness.maxAttempts
                });

                tempConnection = await amqplib.connect(this.config.uri);
                tempConnection.on('close', () => this.handleClose('Connection closed by broker'));
                tempConnection.on('error', (error) =>
                    this.logger.warn?.('RabbitMQ connection error', {
                        error: error instanceof Error ? error.message : error
                    })
                );

                tempChannel = await tempConnection.createChannel();
                await tempChannel.assertExchange(this.config.exchange, 'topic', { durable: true });

                this.connection = tempConnection;
                this.channel = tempChannel;

                this.logger.info?.('RabbitMQ connection ready', {
                    exchange: this.config.exchange
                });

                return tempChannel;
            } catch (error) {
                lastError = error;
                this.logger.warn?.('RabbitMQ not ready yet', {
                    attempt,
                    maxAttempts: readiness.maxAttempts,
                    error: error instanceof Error ? error.message : error
                });

                if (tempChannel) {
                    try {
                        await tempChannel.close();
                    } catch {
                        // ignore
                    }
                }

                if (tempConnection) {
                    try {
                        await tempConnection.close();
                    } catch {
                        // ignore
                    }
                }

                await this.safeClose();

                if (attempt >= readiness.maxAttempts) {
                    break;
                }

                await wait(delayMs);
                delayMs = Math.min(delayMs * readiness.backoffMultiplier, readiness.maxDelayMs);
            }
        }

        this.channelPromise = undefined;

        this.logger.error?.('RabbitMQ not ready after retries', {
            maxAttempts: readiness.maxAttempts,
            error: lastError instanceof Error ? lastError.message : lastError
        });

        throw new Error(
            `RabbitMQ not ready after ${readiness.maxAttempts} attempts: ` +
                `${lastError instanceof Error ? lastError.message : 'unknown error'}`
        );
    }

    private async safeClose(): Promise<void> {
        if (this.channel) {
            try {
                await this.channel.close();
            } catch {
                // Ignore errors while closing
            }
        }

        if (this.connection) {
            try {
                await this.connection.close();
            } catch {
                // Ignore errors while closing
            }
        }

        this.connection = undefined;
        this.channel = undefined;
    }

    private handleClose(reason: string): void {
        this.logger.warn?.('RabbitMQ connection closed', { reason });
        this.connection = undefined;
        this.channel = undefined;
        this.channelPromise = undefined;
    }
}

function wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
