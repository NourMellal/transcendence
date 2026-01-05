import { Channel, ConsumeMessage } from 'amqplib';
import {
    EventType,
    GameFinishedIntegrationEvent,
    IntegrationEvent
} from '@transcendence/shared-messaging';
import { EventSerializer } from './serialization/EventSerializer';
import { CompleteMatchUseCase } from '../../application/use-cases/complete-match.usecase';
import { createLogger } from '@transcendence/shared-logging';

const logger = createLogger('tournament-messaging');

export class GameFinishedConsumer {
    constructor(
        private readonly channel: Channel,
        private readonly serializer: EventSerializer,
        private readonly completeMatch: CompleteMatchUseCase
    ) {}

    async start(queue: string): Promise<void> {
        await this.channel.assertQueue(queue, { durable: true });
        await this.channel.bindQueue(queue, 'transcendence.events', EventType.GAME_FINISHED);
        await this.channel.consume(queue, (message) => this.handle(message), { noAck: false });
    }

    private async handle(message: ConsumeMessage | null): Promise<void> {
        if (!message) return;

        try {
            const event = this.serializer.deserialize<IntegrationEvent<unknown>>(message.content);
            if (event.metadata.eventType !== EventType.GAME_FINISHED) {
                this.channel.ack(message);
                return;
            }

            const parsed = this.parsePayload(event);
            if (!parsed) {
                logger.warn('Invalid game.finished payload, dropping message');
                this.channel.nack(message, false, false);
                return;
            }

            await this.completeMatch.execute({
                tournamentId: parsed.tournamentId!,
                matchId: parsed.matchId,
                gameId: parsed.gameId,
                winnerId: parsed.winnerId,
                finishedAt: parsed.finishedAt
            });

            this.channel.ack(message);
        } catch (error) {
            logger.error(
                { error: error instanceof Error ? error.message : 'unknown' },
                'Failed to handle game.finished event'
            );
            this.channel.nack(message, false, false);
        }
    }

    private parsePayload(event: IntegrationEvent<unknown>): GameFinishedIntegrationEvent['payload'] | null {
        const payload = event.payload as any;
        const allowedGameTypes: Array<GameFinishedIntegrationEvent['payload']['gameType']> = [
            'classic',
            'tournament',
            'ranked'
        ];

        if (
            typeof payload?.tournamentId !== 'string' ||
            typeof payload?.gameId !== 'string' ||
            typeof payload?.winnerId !== 'string' ||
            typeof payload?.loserId !== 'string' ||
            typeof payload?.duration !== 'number' ||
            !payload?.finalScore ||
            typeof payload.finalScore.player1 !== 'number' ||
            typeof payload.finalScore.player2 !== 'number' ||
            !allowedGameTypes.includes(payload.gameType)
        ) {
            return null;
        }

        const finishedAt = new Date(payload.finishedAt);
        if (Number.isNaN(finishedAt.getTime())) {
            return null;
        }

        return {
            gameId: payload.gameId,
            winnerId: payload.winnerId,
            loserId: payload.loserId,
            finalScore: payload.finalScore,
            duration: payload.duration,
            finishedAt,
            gameType: payload.gameType,
            tournamentId: payload.tournamentId,
            matchId: typeof payload.matchId === 'string' ? payload.matchId : undefined
        };
    }
}
