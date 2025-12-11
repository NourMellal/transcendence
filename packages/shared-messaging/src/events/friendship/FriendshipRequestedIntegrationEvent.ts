import { IntegrationEvent } from '../../base/IntegrationEvent';
import { EventType } from '../../enums/EventType';

export interface FriendshipRequestedPayload {
    readonly friendshipId: string;
    readonly requesterId: string;
    readonly addresseeId: string;
    readonly requestedAt: Date;
}

export type FriendshipRequestedIntegrationEvent = IntegrationEvent<FriendshipRequestedPayload>;

export function createFriendshipRequestedEvent(
    payload: FriendshipRequestedPayload,
    correlationId?: string
): FriendshipRequestedIntegrationEvent {
    return {
        metadata: {
            eventId: crypto.randomUUID(),
            eventType: EventType.FRIENDSHIP_REQUESTED,
            version: '1.0.0',
            timestamp: new Date(),
            source: 'user-service',
            correlationId,
        },
        payload,
    };
}
