import { IntegrationEvent } from '../../base/IntegrationEvent';
import { EventType } from '../../enums/EventType';

/**
 * Payload for UserRegistered integration event
 */
export interface UserRegisteredPayload {
    readonly userId: string;
    readonly username: string;
    readonly email: string;
    readonly registeredAt: Date;
}

/**
 * Integration event published when a new user registers
 *
 * @version 1.0.0
 * @published_by user-service
 * @consumed_by tournament-service, notification-service
 */
export type UserRegisteredIntegrationEvent = IntegrationEvent<UserRegisteredPayload>;

/**
 * Helper function to create UserRegistered integration event
 */
export function createUserRegisteredEvent(
    payload: UserRegisteredPayload,
    correlationId?: string
): UserRegisteredIntegrationEvent {
    return {
        metadata: {
            eventId: crypto.randomUUID(),
            eventType: EventType.USER_REGISTERED,
            version: '1.0.0',
            timestamp: new Date(),
            source: 'user-service',
            correlationId,
        },
        payload,
    };
}
