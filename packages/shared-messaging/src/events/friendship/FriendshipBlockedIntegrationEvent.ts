import { IntegrationEvent } from '../../base/IntegrationEvent';
import { EventType } from '../../enums/EventType';

export interface FriendshipBlockedPayload {
    readonly friendshipId: string;
    readonly blockerId: string;
    readonly blockedUserId: string;
    readonly blockedAt: Date;
}

export type FriendshipBlockedIntegrationEvent = IntegrationEvent<FriendshipBlockedPayload>;

export function createFriendshipBlockedEvent(
    payload: FriendshipBlockedPayload,
    correlationId?: string
): FriendshipBlockedIntegrationEvent {
    return {
        metadata: {
            eventId: crypto.randomUUID(),
            eventType: EventType.FRIENDSHIP_BLOCKED,
            version: '1.0.0',
            timestamp: new Date(),
            source: 'user-service',
            correlationId,
        },
        payload,
    };
}
