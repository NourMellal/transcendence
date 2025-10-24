import { IntegrationEvent } from '../../base/IntegrationEvent';
import { EventType } from '../../enums/EventType';

export interface UserDeletedPayload {
    readonly userId: string;
    readonly deletedAt: Date;
    readonly reason?: string;
}

export type UserDeletedIntegrationEvent = IntegrationEvent<UserDeletedPayload>;

export function createUserDeletedEvent(
    payload: UserDeletedPayload,
    correlationId?: string
): UserDeletedIntegrationEvent {
    return {
        metadata: {
            eventId: crypto.randomUUID(),
            eventType: EventType.USER_DELETED,
            version: '1.0.0',
            timestamp: new Date(),
            source: 'user-service',
            correlationId,
        },
        payload,
    };
}
