import { IntegrationEvent } from '../../base/IntegrationEvent';
import { EventType } from '../../enums/EventType';

export interface FriendshipRejectedPayload {
    readonly friendshipId: string;
    readonly requesterId: string;
    readonly addresseeId: string;
    readonly rejectedAt: Date;
}

export type FriendshipRejectedIntegrationEvent = IntegrationEvent<FriendshipRejectedPayload>;

export function createFriendshipRejectedEvent(
    payload: FriendshipRejectedPayload,
    correlationId?: string
): FriendshipRejectedIntegrationEvent {
    return {
        metadata: {
            eventId: crypto.randomUUID(),
            eventType: EventType.FRIENDSHIP_REJECTED,
            version: '1.0.0',
            timestamp: new Date(),
            source: 'user-service',
            correlationId,
        },
        payload,
    };
}
