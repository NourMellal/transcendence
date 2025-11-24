import { IntegrationEvent } from '../../base/IntegrationEvent';
import { EventType } from '../../enums/EventType';

export interface PlayerRegisteredPayload {
    readonly tournamentId: string;
    readonly playerId: string;
    readonly registeredAt: Date;
}

export type PlayerRegisteredIntegrationEvent = IntegrationEvent<PlayerRegisteredPayload>;

export function createPlayerRegisteredEvent(
    payload: PlayerRegisteredPayload,
    correlationId?: string
): PlayerRegisteredIntegrationEvent {
    return {
        metadata: {
            eventId: crypto.randomUUID(),
            eventType: EventType.PLAYER_REGISTERED_FOR_TOURNAMENT,
            version: '1.0.0',
            timestamp: new Date(),
            source: 'tournament-service',
            correlationId
        },
        payload
    };
}
