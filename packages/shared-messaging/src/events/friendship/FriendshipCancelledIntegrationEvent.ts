import { IntegrationEvent } from '../../base/IntegrationEvent';
import { EventType } from '../../enums/EventType';

export interface FriendshipCancelledPayload {
    readonly friendshipId: string;
    readonly requesterId: string;
    readonly addresseeId: string;
    readonly cancelledAt: Date;
}

export type FriendshipCancelledIntegrationEvent = IntegrationEvent<FriendshipCancelledPayload>;

export function createFriendshipCancelledEvent(
    payload: FriendshipCancelledPayload,
    correlationId?: string
): FriendshipCancelledIntegrationEvent {
    return {
        metadata: {
            eventId: crypto.randomUUID(),
            eventType: EventType.FRIENDSHIP_CANCELLED,
            version: '1.0.0',
            timestamp: new Date(),
            source: 'user-service',
            correlationId,
        },
        payload,
    };
}
