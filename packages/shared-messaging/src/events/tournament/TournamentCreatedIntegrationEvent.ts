import { IntegrationEvent } from '../../base/IntegrationEvent';
import { EventType } from '../../enums/EventType';

export interface TournamentCreatedPayload {
    readonly tournamentId: string;
    readonly name: string;
    readonly creatorId: string;
    readonly maxPlayers: number;
    readonly startDate: Date;
    readonly createdAt: Date;
}

/**
 * Integration event published when a tournament is created
 *
 * @version 1.0.0
 * @published_by tournament-service
 * @consumed_by notification-service, stats-service
 */
export type TournamentCreatedIntegrationEvent = IntegrationEvent<TournamentCreatedPayload>;

export function createTournamentCreatedEvent(
    payload: TournamentCreatedPayload,
    correlationId?: string
): TournamentCreatedIntegrationEvent {
    return {
        metadata: {
            eventId: crypto.randomUUID(),
            eventType: EventType.TOURNAMENT_CREATED,
            version: '1.0.0',
            timestamp: new Date(),
            source: 'tournament-service',
            correlationId,
        },
        payload,
    };
}
