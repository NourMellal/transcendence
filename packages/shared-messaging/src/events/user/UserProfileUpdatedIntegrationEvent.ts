import { IntegrationEvent } from '../../base/IntegrationEvent';
import { EventType } from '../../enums/EventType';

export interface UserProfileUpdatedPayload {
    readonly userId: string;
    readonly updatedFields: {
        readonly username?: string;
        readonly avatarUrl?: string;
        readonly displayName?: string;
    };
    readonly updatedAt: Date;
}

/**
 * Integration event published when the user profile is updated
 *
 * @version 1.0.0
 * @published_by user-service
 * @consumed_by tournament-service, game-service
 */
export type UserProfileUpdatedIntegrationEvent = IntegrationEvent<UserProfileUpdatedPayload>;

export function createUserProfileUpdatedEvent(
    payload: UserProfileUpdatedPayload,
    correlationId?: string
): UserProfileUpdatedIntegrationEvent {
    return {
        metadata: {
            eventId: crypto.randomUUID(),
            eventType: EventType.USER_PROFILE_UPDATED,
            version: '1.0.0',
            timestamp: new Date(),
            source: 'user-service',
            correlationId,
        },
        payload,
    };
}
