# Event: `user.deleted`

## Overview
`user.deleted` is emitted by **user-service** whenever an account is permanently removed. Downstream services subscribe to cancel active matches, release resources, and keep projections consistent.

## Producers
- user-service (`DeleteUserUseCase` after a successful transaction)

## Consumers
- game-service – cancels all non-finished games for the deleted user and notifies opponents via WebSocket (`game:cancelled`)
- tournament-service – _planned_: remove players from brackets and standings

## Event Schema
```ts
import type { UserDeletedIntegrationEvent } from '@transcendence/shared-messaging';

type UserDeletedEvent = UserDeletedIntegrationEvent;

interface UserDeletedPayload {
  userId: string;
  deletedAt: Date;
  reason?: string;
}

interface EventMetadata {
  eventId: string;
  eventType: 'user.deleted';
  version: '1.0.0';
  timestamp: Date;
  source: 'user-service';
  correlationId?: string;
}
```

## Example Payload
```json
{
  "metadata": {
    "eventId": "c8ccf2d7-0ef2-4d56-8db5-2b3bd6271b48",
    "eventType": "user.deleted",
    "version": "1.0.0",
    "timestamp": "2025-02-18T19:30:00.000Z",
    "source": "user-service",
    "correlationId": "req-7b1ced"
  },
  "payload": {
    "userId": "user-123",
    "deletedAt": "2025-02-18T19:30:00.000Z",
    "reason": "user_request"
  }
}
```

## Delivery Guarantees
- **At-least-once** – consumers must handle duplicate events idempotently.
- **Ordering** – not guaranteed relative to other events; order only guaranteed within a single queue.

## Retry & DLQ Strategy
- Publisher retries implicitly through RabbitMQ delivery; consumer failures trigger `channel.nack` without requeue, pushing the message to the DLQ.
- Configure queue with:
  - max retries: 3 (RabbitMQ policy)
  - exponential backoff: 1s → 2s → 4s (via dead-letter + delayed exchange)
  - dead-letter queue: `user-events-dlq`
- Logging is mandatory on both publisher (when a publish attempt fails) and consumer sides to trace retries.

## Testing
- **User Service** – `services/user-service/test/integration/application/delete-user-events.spec.ts`
- **Game Service handler** – `services/game-service/tests/integration/messaging/subscriber-handlers.test.ts`
- **Cross-service flow** – `tests/integration/user-deleted-flow.spec.ts`

## Notes
- Event is emitted only after the user deletion transaction commits.
- Publishing failures are logged but do not block API responses; a follow-up outbox/retry mechanism can replay missed events.
- WebSocket payload sent to opponents:
  ```json
  {
    "event": "game:cancelled",
    "data": {
      "gameId": "<uuid>",
      "reason": "opponent_deleted",
      "message": "Opponent account was deleted. This match has been cancelled."
    }
  }
  ```
