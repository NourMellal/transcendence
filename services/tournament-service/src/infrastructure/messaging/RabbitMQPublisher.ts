import {
    createPlayerRegisteredEvent,
    createTournamentCreatedEvent,
    createTournamentFinishedEvent,
    createTournamentStartedEvent,
    TournamentMatchSeed
} from '@transcendence/shared-messaging';
import { Tournament, TournamentMatch, TournamentParticipant } from '../../domain/entities';
import { ITournamentEventPublisher } from '../../application/ports/messaging/ITournamentEventPublisher';
import { RabbitMQConnection } from './RabbitMQConnection';
import { EventSerializer } from './serialization/EventSerializer';

export class RabbitMQTournamentEventPublisher implements ITournamentEventPublisher {
    constructor(
        private readonly connection: RabbitMQConnection,
        private readonly serializer: EventSerializer,
        private readonly exchange: string
    ) {}

    async publishTournamentCreated(tournament: Tournament): Promise<void> {
        const event = createTournamentCreatedEvent({
            tournamentId: tournament.id,
            name: tournament.name,
            creatorId: tournament.creatorId,
            maxPlayers: tournament.maxParticipants,
            startDate: tournament.createdAt,
            createdAt: tournament.createdAt
        });
        await this.publish('tournament.created', event);
    }

    async publishPlayerRegistered(tournamentId: string, participant: TournamentParticipant): Promise<void> {
        const event = createPlayerRegisteredEvent({
            tournamentId,
            playerId: participant.userId,
            registeredAt: participant.joinedAt
        });
        await this.publish('tournament.player.registered', event);
    }

    async publishTournamentStarted(
        tournament: Tournament,
        matches: TournamentMatch[]
    ): Promise<void> {
        const seeds: TournamentMatchSeed[] = matches.map((m) => ({
            matchId: m.id,
            player1Id: m.player1Id ?? '',
            player2Id: m.player2Id ?? '',
            round: m.round
        }));

        const event = createTournamentStartedEvent({
            tournamentId: tournament.id,
            startedAt: tournament.startedAt ?? new Date(),
            matches: seeds
        });
        await this.publish('tournament.started', event);
    }

    async publishTournamentFinished(
        tournament: Tournament,
        winnerId: string,
        runnerUpId: string,
        participants: TournamentParticipant[]
    ): Promise<void> {
        const event = createTournamentFinishedEvent({
            tournamentId: tournament.id,
            winnerId,
            runnerUpId,
            participants: participants.map((p) => p.userId),
            finishedAt: tournament.finishedAt ?? new Date(),
            totalMatches: tournament.maxParticipants - 1,
            duration: tournament.startedAt
                ? Math.round(((tournament.finishedAt ?? new Date()).getTime() - tournament.startedAt.getTime()) / 1000)
                : 0
        });
        await this.publish('tournament.finished', event);
    }

    private async publish(routingKey: string, event: any): Promise<void> {
        const channel = await this.connection.getChannel();
        const buffer = this.serializer.serialize(event);
        channel.publish(this.exchange, routingKey, buffer, {
            contentType: 'application/json',
            persistent: true
        });
    }
}
