import { IntegrationEvent } from "../../base/IntegrationEvent";
import { EventType } from "../../enums/EventType";

export interface GameFinishedPayload {
    readonly gameId: string;
    readonly winnerId: string;
    readonly loserId: string;
    readonly finalScore: {
        readonly player1: number;
        readonly player2: number;
    };
    readonly duration: number;
    readonly finishedAt: Date;
    readonly gameType: 'classic' | 'tournament' | 'ranked';
    readonly tournamentId?: string;
    readonly matchId?: string; // If it's a tournament game
}

/**
 * Integration event published when a game finishes
 *
 * CRITICAL: This event triggers:
 * - Tournament bracket updates
 * - User stats updates
 * - Ranking calculations
 * - Achievement checks
 *
 * @version 1.0.0
 * @published_by game-service
 * @consumed_by tournament-service, stats-service, ranking-service, achievement-service
 */
export type GameFinishedIntegrationEvent = IntegrationEvent<GameFinishedPayload>;

export function createGameFinishedEvent(
    payload: GameFinishedPayload,
    correlationId?: string
): GameFinishedIntegrationEvent {
    return {
        metadata: {
            eventId: crypto.randomUUID(),
            eventType: EventType.GAME_FINISHED,
            version: '1.0.0',
            timestamp: new Date(),
            source: 'game-service',
            correlationId,
        },
        payload,
    };
}