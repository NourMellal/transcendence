import amqplib, { Channel, ChannelModel } from 'amqplib';

export interface MessagingConnectionConfig {
  readonly uri: string;
  readonly exchange: string;
}

export class RabbitMQConnection {
  private connection?: ChannelModel;
  private channel?: Channel;

  constructor(private readonly config: MessagingConnectionConfig) {}

  async getChannel(): Promise<Channel> {
    if (!this.connection) {
      this.connection = await amqplib.connect(this.config.uri);
      this.connection.on('close', () => {
        this.connection = undefined;
        this.channel = undefined;
      });
    }

    if (!this.channel) {
      const channel = await this.connection.createChannel();
      await channel.assertExchange(this.config.exchange, 'topic', { durable: true });
      this.channel = channel;
    }

    return this.channel;
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
