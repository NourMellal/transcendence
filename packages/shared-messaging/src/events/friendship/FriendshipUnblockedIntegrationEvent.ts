import { IntegrationEvent } from '../../base/IntegrationEvent';
import { EventType } from '../../enums/EventType';

export interface FriendshipUnblockedPayload {
    readonly friendshipId: string;
    readonly unblockerId: string;
    readonly otherUserId: string;
    readonly unblockedAt: Date;
}

export type FriendshipUnblockedIntegrationEvent = IntegrationEvent<FriendshipUnblockedPayload>;

export function createFriendshipUnblockedEvent(
    payload: FriendshipUnblockedPayload,
    correlationId?: string
): FriendshipUnblockedIntegrationEvent {
    return {
        metadata: {
            eventId: crypto.randomUUID(),
            eventType: EventType.FRIENDSHIP_UNBLOCKED,
            version: '1.0.0',
            timestamp: new Date(),
            source: 'user-service',
            correlationId,
        },
        payload,
    };
}
