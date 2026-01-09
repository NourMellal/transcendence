import amqplib, { Channel, ChannelModel } from 'amqplib';

export interface MessagingConnectionConfig {
    readonly uri: string;
    readonly exchange: string;
}

export class RabbitMQConnection {
    private connection?: ChannelModel;
    private channel?: Channel;
    private isReconnecting = false;

    constructor(private readonly config: MessagingConnectionConfig) {}

    async getChannel(): Promise<Channel> {
        if (!this.connection) {
            // Add heartbeat to detect dead connections
            const uriWithHeartbeat = this.config.uri.includes('?') 
                ? `${this.config.uri}&heartbeat=30`
                : `${this.config.uri}?heartbeat=30`;
            
            this.connection = await amqplib.connect(uriWithHeartbeat);
            
            this.connection.on('close', () => {
                console.warn('⚠️ RabbitMQ connection closed');
                this.connection = undefined;
                this.channel = undefined;
                this.scheduleReconnect();
            });

            this.connection.on('error', (err) => {
                console.error('❌ RabbitMQ connection error:', err.message);
            });
        }

        if (!this.channel) {
            const channel = await this.connection.createChannel();
            await channel.assertExchange(this.config.exchange, 'topic', { durable: true });
            this.channel = channel;
        }

        return this.channel;
    }

    private scheduleReconnect(): void {
        if (this.isReconnecting) return;
        this.isReconnecting = true;

        console.log('🔄 Attempting RabbitMQ reconnection in 5s...');
        setTimeout(async () => {
            try {
                await this.getChannel();
                console.log('✅ RabbitMQ reconnected');
            } catch (err) {
                console.error('❌ Reconnection failed, retrying...');
                this.scheduleReconnect();
            } finally {
                this.isReconnecting = false;
            }
        }, 5000);
    }

    async close(): Promise<void> {
        if (this.channel) {
            await this.channel.close();
            this.channel = undefined;
        }

        if (this.connection) {
            await this.connection.close();
            this.connection = undefined;
        }
    }
}