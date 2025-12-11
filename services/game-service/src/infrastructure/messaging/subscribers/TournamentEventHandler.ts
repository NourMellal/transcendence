import { Channel, ConsumeMessage } from 'amqplib';
import {
    EventType,
    IntegrationEvent,
    TournamentMatchSeed,
    TournamentStartedIntegrationEvent,
} from '@transcendence/shared-messaging';
import { EventSerializer } from '../serialization/EventSerializer';
import { IGameRepository } from '../../../application/ports/repositories/IGameRepository';
import { Game } from '../../../domain/entities';

export class TournamentEventHandler {
    constructor(
        private readonly channel: Channel,
        private readonly serializer: EventSerializer,
        private readonly gameRepository: IGameRepository
    ) {}

    async start(queue: string): Promise<void> {
        await this.channel.assertQueue(queue, { durable: true });
        await this.channel.bindQueue(queue, 'transcendence.events', 'tournament.*');
        await this.channel.consume(queue, (message) => this.handle(message), { noAck: false });
    }

    private async handle(message: ConsumeMessage | null): Promise<void> {
        if (!message) {
            return;
        }

        try {
            const event = this.serializer.deserialize<IntegrationEvent<unknown>>(message.content);

            if (event.metadata.eventType === EventType.TOURNAMENT_STARTED) {
                const parsed = this.parseTournamentStartedEvent(event.payload);
                if (!parsed) {
                    this.channel.nack(message, false, false);
                    return;
                }

                await this.seedMatches(parsed.tournamentId, parsed.matches);
            }

            this.channel.ack(message);
        } catch (error) {
            this.channel.nack(message, false, false);
            console.error('Failed to handle tournament event', error);
        }
    }

    private parseTournamentStartedEvent(payload: unknown): TournamentStartedIntegrationEvent['payload'] | null {
        if (!payload || typeof payload !== 'object') {
            return null;
        }

        const { tournamentId, startedAt, matches } = payload as Record<string, unknown>;

        if (typeof tournamentId !== 'string' || !Array.isArray(matches)) {
            return null;
        }

        const normalizedMatches: TournamentMatchSeed[] = [];

        for (const match of matches) {
            if (!match || typeof match !== 'object') {
                return null;
            }

            const { matchId, player1Id, player2Id, round, scheduledAt } = match as Record<
                string,
                unknown
            >;

            if (
                typeof matchId !== 'string' ||
                typeof player1Id !== 'string' ||
                typeof player2Id !== 'string' ||
                typeof round !== 'number'
            ) {
                return null;
            }

            const parsedScheduledAt = scheduledAt ? new Date(scheduledAt as string | number | Date) : undefined;
            if (parsedScheduledAt && Number.isNaN(parsedScheduledAt.getTime())) {
                return null;
            }

            normalizedMatches.push({
                matchId,
                player1Id,
                player2Id,
                round,
                scheduledAt: parsedScheduledAt,
            });
        }

        const parsedStartedAt = new Date(startedAt as string | number | Date);
        if (Number.isNaN(parsedStartedAt.getTime())) {
            return null;
        }

        return {
            tournamentId,
            startedAt: parsedStartedAt,
            matches: normalizedMatches,
        };
    }

    private async seedMatches(tournamentId: string, matches: TournamentMatchSeed[]): Promise<void> {
        for (const match of matches) {
            const player1Active = await this.gameRepository.findActiveByPlayer(match.player1Id);
            const player2Active = await this.gameRepository.findActiveByPlayer(match.player2Id);

            if (player1Active || player2Active) {
                continue;
            }

            const game = Game.create({
                playerId: match.player1Id,
                opponentId: match.player2Id,
                mode: 'TOURNAMENT',
                tournamentId,
                config: {},
            });

            await this.gameRepository.create(game);
        }
    }
}
