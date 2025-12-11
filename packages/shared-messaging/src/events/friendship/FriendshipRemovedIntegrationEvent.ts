import { IntegrationEvent } from '../../base/IntegrationEvent';
import { EventType } from '../../enums/EventType';

export interface FriendshipRemovedPayload {
    readonly friendshipId: string;
    readonly removerId: string;
    readonly otherUserId: string;
    readonly removedAt: Date;
}

export type FriendshipRemovedIntegrationEvent = IntegrationEvent<FriendshipRemovedPayload>;

export function createFriendshipRemovedEvent(
    payload: FriendshipRemovedPayload,
    correlationId?: string
): FriendshipRemovedIntegrationEvent {
    return {
        metadata: {
            eventId: crypto.randomUUID(),
            eventType: EventType.FRIENDSHIP_REMOVED,
            version: '1.0.0',
            timestamp: new Date(),
            source: 'user-service',
            correlationId,
        },
        payload,
    };
}
