import { IntegrationEvent } from '../../base/IntegrationEvent';
import { EventType } from '../../enums/EventType';

export interface FriendshipAcceptedPayload {
    readonly friendshipId: string;
    readonly requesterId: string;
    readonly addresseeId: string;
    readonly acceptedAt: Date;
}

export type FriendshipAcceptedIntegrationEvent = IntegrationEvent<FriendshipAcceptedPayload>;

export function createFriendshipAcceptedEvent(
    payload: FriendshipAcceptedPayload,
    correlationId?: string
): FriendshipAcceptedIntegrationEvent {
    return {
        metadata: {
            eventId: crypto.randomUUID(),
            eventType: EventType.FRIENDSHIP_ACCEPTED,
            version: '1.0.0',
            timestamp: new Date(),
            source: 'user-service',
            correlationId,
        },
        payload,
    };
}
