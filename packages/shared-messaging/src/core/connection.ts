import amqplib, {Connection, Channel} from "amqplib";
import {RabbitMQConfig, defaultConfig} from "../config/messaging.config";

export class MessagingConnection {
    private connection: Connection | null = null;
    private channel: Channel | null = null;
    private config: RabbitMQConfig;
    private reconnectAttempts = 0;

    constructor(config: Partial<RabbitMQConfig> = {}) {
        this.config = { ...defaultConfig, ...config };
    }

    async connect(): Promise<Channel> {
        try {
            if (this.channel && this.connection) {
                return  this.channel;
            }

            this.connection = await amqplib.connect(this.config.url);
            this.channel = await this.connection.createChannel();
            this.reconnectAttempts = 0;

            this.connection.on('error', this.handleConnectionError.bind(this));
            this.connection.on('close', this.handleConnectionClose.bind(this));

            return this.channel;
        } catch (error) {
            return this.handleConnectionError(error);
        }
    }

    private async handleConnectionError(error: any): Promise<Channel> {
            console.error('RabbitMQ connection error:', error.message);
            return this.reconnect();
    }

    private async handleConnectionClose(): Promise<Channel> {
            console.warn('RabbitMQ connection closed');
            return this.reconnect();
    }

    private async reconnect(): Promise<Channel> {
        if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
            throw new Error('Max Reconnecting attempts reached');
        }

        this.reconnectAttempts++;
        console.log(`Reconnection attempt: ${this.reconnectAttempts}/${this.config.maxReconnectAttempts}`);

        return new Promise((resolve, reject) => {
            setTimeout(async () => {
                try {
                    this.connection = await amqplib.connect(this.config.url);
                    this.channel = await this.connection.createChannel();
                    resolve(this.channel);
                } catch (error) {
                    reject(error);
                }
            }, this.config.reconnectTimeout)
        });
    }

    async close(): Promise<void> {
        try {
            if (this.channel) {
                await this.channel.close();
            }
            if (this.connection) {
                await this.connection.close();
            }
            this.connection = null;
            this.channel = null;
        } catch (error) {
            console.error('RabbitMQ close error:', error.message);
            throw error;
        }
    }

}