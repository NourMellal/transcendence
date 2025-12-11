import { IntegrationEvent } from '../../base/IntegrationEvent';
import { EventType } from '../../enums/EventType';

export interface GameStartedPayload {
    readonly gameId: string;
    readonly player1Id: string;
    readonly player2Id: string;
    readonly gameType: 'classic' | 'tournament' | 'ranked';
    readonly tournamentId?: string; // If it's a tournament game
    readonly startedAt: Date;
    readonly gameSettings: {
        readonly maxScore: number;
        readonly ballSpeed: number;
    };
}

/**
 * Integration event published when a game starts
 *
 * @version 1.0.0
 * @published_by game-service
 * @consumed_by tournament-service, stats-service, notification-service
 */
export type GameStartedIntegrationEvent = IntegrationEvent<GameStartedPayload>;

export function createGameStartedEvent(
    payload: GameStartedPayload,
    correlationId?: string
): GameStartedIntegrationEvent {
    return {
        metadata: {
            eventId: crypto.randomUUID(),
            eventType: EventType.GAME_STARTED,
            version: '1.0.0',
            timestamp: new Date(),
            source: 'game-service',
            correlationId,
        },
        payload,
    };
}
