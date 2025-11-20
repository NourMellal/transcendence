import {
    createGameFinishedEvent,
    createGameStartedEvent,
    createPlayerJoinedEvent
} from '@transcendence/shared-messaging';
import { Game } from '../../../domain/entities';
import { IGameEventPublisher } from '../../../application/ports/messaging/IGameEventPublisher';
import { RabbitMQConnection } from '../connection';
import { EventSerializer } from '../serialization/EventSerializer';

export class RabbitMQGameEventPublisher implements IGameEventPublisher {
    constructor(
        private readonly connection: RabbitMQConnection,
        private readonly serializer: EventSerializer,
        private readonly exchange: string
    ) {}

    async publishGameCreated(game: Game): Promise<void> {
        const player = game.players[0];
        const event = createPlayerJoinedEvent({
            gameId: game.id,
            playerId: player.id,
            playerNumber: 1,
            joinedAt: new Date()
        });
        await this.publish('game.created', event);
    }

    async publishGameStarted(game: Game): Promise<void> {
        const [player1, player2] = game.players;
        const event = createGameStartedEvent({
            gameId: game.id,
            player1Id: player1?.id ?? '',
            player2Id: player2?.id ?? '',
            gameType: game.mode === 'tournament' ? 'tournament' : 'classic',
            tournamentId: game.tournamentId,
            startedAt: game.startedAt ?? new Date(),
            gameSettings: {
                maxScore: game.config.scoreLimit,
                ballSpeed: game.config.ballSpeed
            }
        });
        await this.publish('game.started', event);
    }

    async publishGameFinished(game: Game): Promise<void> {
        const winner = game.score.player1 > game.score.player2 ? game.players[0] : game.players[1];
        const loser = winner?.id === game.players[0]?.id ? game.players[1] : game.players[0];
        const startedAt = game.startedAt ?? new Date();
        const finishedAt = game.finishedAt ?? new Date();
        const durationMs = Math.max(0, finishedAt.getTime() - startedAt.getTime());
        const event = createGameFinishedEvent({
            gameId: game.id,
            winnerId: winner?.id ?? '',
            loserId: loser?.id ?? '',
            finalScore: { player1: game.score.player1, player2: game.score.player2 },
            duration: durationMs / 1000,
            finishedAt,
            gameType: game.mode === 'tournament' ? 'tournament' : 'classic',
            tournamentId: game.tournamentId
        });
        await this.publish('game.finished', event);
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
