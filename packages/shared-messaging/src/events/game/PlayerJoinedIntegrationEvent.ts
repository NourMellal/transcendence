import { IntegrationEvent } from '../../base/IntegrationEvent';
import { EventType } from '../../enums/EventType';

export interface PlayerJoinedPayload {
    readonly gameId: string;
    readonly playerId: string;
    readonly playerNumber: 1 | 2;
    readonly joinedAt: Date;
}

export type PlayerJoinedIntegrationEvent = IntegrationEvent<PlayerJoinedPayload>;

export function createPlayerJoinedEvent(
    payload: PlayerJoinedPayload,
    correlationId?: string
): PlayerJoinedIntegrationEvent {
    return {
        metadata: {
            eventId: crypto.randomUUID(),
            eventType: EventType.PLAYER_JOINED,
            version: '1.0.0',
            timestamp: new Date(),
            source: 'game-service',
            correlationId,
        },
        payload,
    };
}
