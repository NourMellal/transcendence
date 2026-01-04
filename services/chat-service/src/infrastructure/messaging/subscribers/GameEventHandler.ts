import { Channel, ConsumeMessage } from 'amqplib';
import {
  EventType,
  GameFinishedIntegrationEvent,
  IntegrationEvent
} from '@transcendence/shared-messaging';
import { createLogger } from '@transcendence/shared-logging';
import { EventSerializer } from '../serialization/EventSerializer';
import { IconversationRepository } from '../../../domain/repositories/conversation-repository';
import { IMessageRepository } from '../../../domain/repositories/message.respository';

const logger = createLogger('GameEventHandler');

export class GameEventHandler {
  constructor(
    private readonly channel: Channel,
    private readonly serializer: EventSerializer,
    private readonly conversationRepository: IconversationRepository,
    private readonly messageRepository: IMessageRepository
  ) {}

  async start(queue: string, exchange: string): Promise<void> {
    await this.channel.assertQueue(queue, { durable: true });
    await this.channel.bindQueue(queue, exchange, 'game.finished');
    await this.channel.consume(queue, (message) => this.handle(message), { noAck: false });
    logger.info({ queue, exchange }, '[GameEventHandler] Listening for game.finished events');
  }

  private async handle(message: ConsumeMessage | null): Promise<void> {
    if (!message) {
      return;
    }

    try {
      const event = this.serializer.deserialize<IntegrationEvent<unknown>>(message.content);

      if (event.metadata.eventType !== EventType.GAME_FINISHED) {
        this.channel.ack(message);
        return;
      }

      const parsed = this.parseGameFinished(event);
      if (!parsed) {
        logger.warn('[GameEventHandler] Invalid game.finished payload, dropping message');
        this.channel.nack(message, false, false);
        return;
      }

      await this.deleteConversationForGame(parsed.payload.gameId);
      this.channel.ack(message);
    } catch (error) {
      logger.error({ err: error }, '[GameEventHandler] Failed to handle game.finished');
      this.channel.nack(message, false, true);
    }
  }

  private parseGameFinished(
    event: IntegrationEvent<unknown>
  ): GameFinishedIntegrationEvent | null {
    if (!event || typeof event !== 'object') {
      return null;
    }

    if (event.metadata?.eventType !== EventType.GAME_FINISHED) {
      return null;
    }

    const payload = (event as GameFinishedIntegrationEvent).payload;
    if (!payload || typeof payload !== 'object' || typeof payload.gameId !== 'string') {
      return null;
    }

    return event as GameFinishedIntegrationEvent;
  }

  private async deleteConversationForGame(gameId: string): Promise<void> {
    const conversation = await this.conversationRepository.findByGameId(gameId);
    if (!conversation) {
      logger.debug({ gameId }, '[GameEventHandler] No conversation to delete for game');
      return;
    }

    await this.messageRepository.deleteByConversationId(conversation.id.toString());
    await this.conversationRepository.deleteByGameId(gameId);
    logger.info(
      {
        gameId,
        conversationId: conversation.id.toString()
      },
      '[GameEventHandler] Deleted game conversation after game.finished'
    );
  }
}
