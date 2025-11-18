import { IntegrationEvent } from '../../base/IntegrationEvent';
import { EventType } from '../../enums/EventType';

export interface UserAuthenticatedPayload {
    readonly userId: string;
    readonly authenticatedAt: Date;
    readonly authenticationMethod: 'password' | 'oauth' | '2fa';
    readonly sessionExpiresAt?: Date;
}

export type UserAuthenticatedIntegrationEvent = IntegrationEvent<UserAuthenticatedPayload>;

export function createUserAuthenticatedEvent(
    payload: UserAuthenticatedPayload,
    correlationId?: string
): UserAuthenticatedIntegrationEvent {
    return {
        metadata: {
            eventId: crypto.randomUUID(),
            eventType: EventType.USER_AUTHENTICATED,
            version: '1.0.0',
            timestamp: new Date(),
            source: 'user-service',
            correlationId,
        },
        payload,
    };
}
