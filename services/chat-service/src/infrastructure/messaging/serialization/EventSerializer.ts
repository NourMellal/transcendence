import { IntegrationEvent } from '@transcendence/shared-messaging';

export class EventSerializer {
  serialize(event: IntegrationEvent<any>): Buffer {
    return Buffer.from(
      JSON.stringify({
        metadata: {
          ...event.metadata,
          timestamp: event.metadata.timestamp.toISOString()
        },
        payload: event.payload
      })
    );
  }

  deserialize<TEvent extends IntegrationEvent<any>>(message: Buffer): TEvent {
    const parsed = JSON.parse(message.toString());
    return {
      ...parsed,
      metadata: {
        ...parsed.metadata,
        timestamp: new Date(parsed.metadata.timestamp)
      }
    } as TEvent;
  }
}
