import { IntegrationEvent } from '../../base/IntegrationEvent';
import { EventType } from '../../enums/EventType';

export interface TournamentFinishedPayload {
    readonly tournamentId: string;
    readonly winnerId: string;
    readonly runnerUpId: string;
    readonly participants: string[]; // User IDs
    readonly finishedAt: Date;
    readonly totalMatches: number;
    readonly duration: number; // in seconds
}

/**
 * Integration event published when a tournament finishes
 *
 * @version 1.0.0
 * @published_by tournament-service
 * @consumed_by stats-service, ranking-service, achievement-service, notification-service
 */
export type TournamentFinishedIntegrationEvent = IntegrationEvent<TournamentFinishedPayload>;

export function createTournamentFinishedEvent(
    payload: TournamentFinishedPayload,
    correlationId?: string
): TournamentFinishedIntegrationEvent {
    return {
        metadata: {
            eventId: crypto.randomUUID(),
            eventType: EventType.TOURNAMENT_FINISHED,
            version: '1.0.0',
            timestamp: new Date(),
            source: 'tournament-service',
            correlationId,
        },
        payload,
    };
}
