# Hexagonal Architecture & Event-Driven Microservices Guide

## Table of Contents
1. [Overview](#overview)
2. [Architecture Principles](#architecture-principles)
3. [Service Structure](#service-structure)
4. [Messaging Infrastructure](#messaging-infrastructure)
5. [Development Workflow](#development-workflow)
6. [Team Collaboration](#team-collaboration)

---

## Overview

Transcendence implements a **microservices architecture** with **hexagonal (ports & adapters) pattern** for each service, using **RabbitMQ** for event-driven communication.

### Key Benefits

✅ **Loose Coupling**: Services communicate via events, not direct calls
✅ **Independent Development**: 5 developers can work in parallel
✅ **Testability**: Domain logic isolated from infrastructure
✅ **Scalability**: Each service scales independently
✅ **Maintainability**: Clear separation of concerns

---

## Architecture Principles

### 1. Hexagonal Architecture (Ports & Adapters)

```
┌────────────────────────────────────────────────┐
│              SERVICE ARCHITECTURE              │
├────────────────────────────────────────────────┤
│                                                │
│  ┌───────────────────────────────────────────┐ │
│  │         DOMAIN LAYER (Core)               │ │
│  │  • Entities                               │ │
│  │  • Business Logic                         │ │
│  │  • Domain Events                          │ │
│  │  • Repository Interfaces                  │ │
│  └───────────────────────────────────────────┘ │
│                     ▲                          │
│                     │                          │
│  ┌───────────────────────────────────────────┐ │
│  │      APPLICATION LAYER                    │ │
│  │  • Use Cases                              │ │
│  │  • Application Services                   │ │
│  │  • DTOs                                   │ │
│  └───────────────────────────────────────────┘ │
│                     ▲                          │
│                     │                          │
│  ┌───────────────────────────────────────────┐ │
│  │    INFRASTRUCTURE LAYER (Adapters)        │ │
│  │  • HTTP Controllers                       │ │
│  │  • Database Repositories                  │ │
│  │  • RabbitMQ Messaging                     │ │
│  └───────────────────────────────────────────┘ │
│                                                │
└────────────────────────────────────────────────┘
```

### 2. Event-Driven Communication

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│ User Service │────────▶│   RabbitMQ   │────────▶│ Game Service │
└──────────────┘         └──────────────┘         └──────────────┘
      Publish               Exchange/Queue            Subscribe
  UserRegistered                                   Handle Event
```

### 3. Shared Kernel Pattern

```
packages/shared-messaging/
└── Event Contracts Only (No Implementation)
    ├── Base interfaces
    ├── Event types
    └── Enums
```

---

## Service Structure

### Complete Service Layout

```
services/{service-name}/
├── src/
│   ├── domain/                      # CORE BUSINESS LOGIC
│   │   ├── entities/                # Domain entities (User, Game, etc.)
│   │   ├── events/                  # Domain events (internal to service)
│   │   ├── repositories/            # Repository interfaces (ports)
│   │   └── value-objects/           # Value objects (Email, Username, etc.)
│   │
│   ├── application/                 # USE CASES & ORCHESTRATION
│   │   ├── use-cases/               # Business use cases
│   │   ├── services/                # Application services
│   │   └── dto/                     # Data transfer objects
│   │
│   └── infrastructure/              # EXTERNAL ADAPTERS
│       ├── messaging/               # ═══ RabbitMQ Infrastructure ═══
│       │   ├── RabbitMQConnection.ts       # Connection management
│       │   ├── RabbitMQPublisher.ts        # Publish events
│       │   ├── RabbitMQConsumer.ts         # Consume events
│       │   ├── config/
│       │   │   └── messaging.config.ts     # Exchange/Queue config
│       │   ├── handlers/                   # Event handlers
│       │   │   ├── UserRegisteredHandler.ts
│       │   │   ├── GameFinishedHandler.ts
│       │   │   └── ...
│       │   └── serialization/
│       │       └── EventSerializer.ts      # JSON serialization
│       │
│       ├── database/                # ═══ Database Infrastructure ═══
│       │   ├── repositories/        # Repository implementations
│       │   └── migrations/          # Database migrations
│       │
│       └── http/                    # ═══ HTTP Infrastructure ═══
│           ├── routes/              # Route definitions
│           ├── controllers/         # HTTP controllers
│           └── middlewares/         # HTTP middlewares
│
├── package.json                     # Dependencies (includes amqplib)
├── tsconfig.json                    # TypeScript configuration
└── Dockerfile                       # Container definition
```

---

### Service Implementation Diagram

![Short description](./assets/diagram-service-implementation.png)

## Messaging Infrastructure

### RabbitMQ Configuration

**Service Details:**
- Image: `rabbitmq:3.12-management-alpine`
- AMQP Port: `5672`
- Management UI: `http://localhost:15672`
- Credentials: `transcendence:transcendence_dev`

**Environment Variable:**
```bash
RABBITMQ_URL=amqp://transcendence:transcendence_dev@rabbitmq:5672
```

### Event Flow Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      EVENT FLOW EXAMPLE                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. User Service                                                 │
│     └─▶ User registers                                           │
│         └─▶ Publish: UserRegisteredIntegrationEvent             │
│                                                                   │
│  2. RabbitMQ                                                     │
│     └─▶ Receives event                                          │
│         └─▶ Routes to subscribed queues:                        │
│             ├─▶ game-service.user.registered                    │
│             ├─▶ chat-service.user.registered                    │
│             └─▶ tournament-service.user.registered              │
│                                                                   │
│  3. Consuming Services                                           │
│     ├─▶ Game Service: Creates player profile                    │
│     ├─▶ Chat Service: Initializes chat profile                  │
│     └─▶ Tournament Service: Enables tournament registration     │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Implementation Components

#### 1. RabbitMQConnection.ts
```typescript
// Manages connection lifecycle
// - Connect to RabbitMQ
// - Handle reconnection
// - Create channels
```

#### 2. RabbitMQPublisher.ts
```typescript
// Publishes integration events
// - Serialize event
// - Publish to exchange
// - Handle publish confirmation
```

#### 3. RabbitMQConsumer.ts
```typescript
// Consumes integration events
// - Subscribe to queues
// - Deserialize events
// - Route to appropriate handlers
// - Handle acknowledgments
```

#### 4. Event Handlers
```typescript
// services/game-service/src/infrastructure/messaging/handlers/
// UserRegisteredHandler.ts - Handle user registration
// TournamentStartedHandler.ts - Handle tournament start
```

---

## Shared Messaging Package

### Structure

```
packages/shared-messaging/
├── src/
│   ├── base/
│   │   ├── IntegrationEvent.ts      # Base event interface
│   │   ├── EventMetadata.ts         # Metadata (timestamp, version, etc.)
│   │   └── index.ts
│   │
│   ├── enums/
│   │   ├── EventType.ts             # All event types enum
│   │   ├── EventStatus.ts           # Event status enum
│   │   └── index.ts
│   │
│   ├── events/
│   │   ├── user/
│   │   │   ├── UserRegisteredIntegrationEvent.ts
│   │   │   ├── UserProfileUpdatedIntegrationEvent.ts
│   │   │   ├── UserDeletedIntegrationEvent.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── game/
│   │   │   ├── GameStartedIntegrationEvent.ts
│   │   │   ├── GameFinishedIntegrationEvent.ts
│   │   │   ├── PlayerJoinedIntegrationEvent.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── chat/
│   │   │   ├── MessageSentIntegrationEvent.ts
│   │   │   ├── UserJoinedChatIntegrationEvent.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── tournament/
│   │   │   ├── TournamentCreatedIntegrationEvent.ts
│   │   │   ├── TournamentStartedIntegrationEvent.ts
│   │   │   └── index.ts
│   │   │
│   │   └── index.ts                 # Export all events
│   │
│   └── index.ts                      # Main export
│
├── package.json
└── tsconfig.json
```

### Event Contract Template

```typescript
// Base interface
export interface IntegrationEvent {
  eventId: string;              // Unique event identifier
  eventType: string;            // Event type (e.g., 'user.registered')
  timestamp: Date;              // When event occurred
  metadata: EventMetadata;      // Additional metadata
  data: unknown;                // Event-specific payload
}

// Concrete event example
export interface UserRegisteredIntegrationEvent extends IntegrationEvent {
  eventType: 'user.registered';
  data: {
    userId: string;
    username: string;
    email: string;
    registeredAt: Date;
  };
}
```

---

## Development Workflow

### 1. Initial Setup

```bash
# Clone repository
git clone <repo-url>
cd transcendence

# Install dependencies
pnpm install

# Start infrastructure
docker-compose up -d rabbitmq vault redis

# Start all services
pnpm dev:all
```

### 2. Working on a Service

```bash
# Start single service
pnpm dev:user          # User Service
pnpm dev:game          # Game Service
pnpm dev:chat          # Chat Service
pnpm dev:tournament    # Tournament Service

# Run tests
pnpm --filter @transcendence/user-service test

# Build service
pnpm --filter @transcendence/user-service build
```

### 3. Adding a New Integration Event

**Step 1: Define Event Contract**
```bash
# File: packages/shared-messaging/src/events/user/UserBannedIntegrationEvent.ts
```

```typescript
import { IntegrationEvent } from '../../base';

export interface UserBannedIntegrationEvent extends IntegrationEvent {
  eventType: 'user.banned';
  data: {
    userId: string;
    reason: string;
    bannedUntil: Date;
    bannedBy: string;
  };
}
```

**Step 2: Export Event**
```typescript
// packages/shared-messaging/src/events/user/index.ts
export * from './UserBannedIntegrationEvent';
```

**Step 3: Publish Event (User Service)**
```typescript
// services/user-service/src/application/use-cases/BanUser.usecase.ts
import { UserBannedIntegrationEvent } from '@transcendence/shared-messaging';

class BanUserUseCase {
  async execute(userId: string, reason: string): Promise<void> {
    // Business logic...

    // Publish event
    await this.publisher.publish<UserBannedIntegrationEvent>({
      eventType: 'user.banned',
      data: { userId, reason, bannedUntil, bannedBy }
    });
  }
}
```

**Step 4: Handle Event (Game Service)**
```typescript
// services/game-service/src/infrastructure/messaging/handlers/UserBannedHandler.ts
import { UserBannedIntegrationEvent } from '@transcendence/shared-messaging';

export class UserBannedHandler {
  async handle(event: UserBannedIntegrationEvent): Promise<void> {
    const { userId, bannedUntil } = event.data;

    // Disconnect from active games
    await this.gameService.disconnectPlayer(userId);

    // Update player status
    await this.playerRepository.updateStatus(userId, 'banned');
  }
}
```

---

## Team Collaboration

### Collaboration Best Practices

#### 1. Service Boundaries
- Each developer owns their service completely
- Changes within service don't affect others
- Communicate via integration events only

#### 2. Event Contracts
- Discuss and agree on event contracts together
- Define contracts in `shared-messaging` first
- Version events for backward compatibility

#### 3. Git Workflow
```bash
# Feature branch per service
git checkout -b feature/user-service/add-2fa
git checkout -b feature/game-service/matchmaking

# Minimal merge conflicts (different directories)
```

#### 4. Testing Strategy
```bash
# Unit tests (each developer)
pnpm --filter @transcendence/user-service test

# Integration tests (cross-service)
# Test event publishing and handling
```

---

## Services Overview

### 1. User Service (Port 3001)

**Responsibilities:**
- User registration and authentication
- Profile management
- 2FA/OAuth
- User preferences

**Technologies:**
- Fastify (HTTP)
- SQLite (Database)
- JWT (Authentication)
- RabbitMQ (Events)

**Published Events:**
- `UserRegisteredIntegrationEvent`
- `UserProfileUpdatedIntegrationEvent`
- `UserDeletedIntegrationEvent`

### 2. Game Service (Port 3002)

**Responsibilities:**
- Real-time Pong gameplay
- Game state management
- Match history
- WebSocket connections

**Technologies:**
- Fastify (HTTP)
- Socket.IO (WebSocket)
- SQLite (Database)
- RabbitMQ (Events)

**Published Events:**
- `GameStartedIntegrationEvent`
- `GameFinishedIntegrationEvent`
- `PlayerJoinedIntegrationEvent`

### 3. Chat Service (Port 3003)

**Responsibilities:**
- Real-time messaging
- Chat rooms
- Direct messages
- Message history

**Technologies:**
- Fastify (HTTP)
- Socket.IO (WebSocket)
- SQLite (Database)
- RabbitMQ (Events)

**Published Events:**
- `MessageSentIntegrationEvent`
- `UserJoinedChatIntegrationEvent`

### 4. Tournament Service (Port 3004)

**Responsibilities:**
- Tournament creation
- Bracket generation
- Tournament progression
- Leaderboards

**Technologies:**
- Fastify (HTTP)
- SQLite (Database)
- RabbitMQ (Events)

**Published Events:**
- `TournamentCreatedIntegrationEvent`
- `TournamentStartedIntegrationEvent`

---

## Deployment

### Docker Compose Architecture

```yaml
services:
  user-service:
    depends_on: [rabbitmq, vault]
    environment:
      - RABBITMQ_URL=amqp://transcendence:transcendence_dev@rabbitmq:5672

  game-service:
    depends_on: [rabbitmq]
    environment:
      - RABBITMQ_URL=amqp://transcendence:transcendence_dev@rabbitmq:5672

  rabbitmq:
    image: rabbitmq:3.12-management-alpine
    ports:
      - "5672:5672"    # AMQP
      - "15672:15672"  # Management UI
```

### Monitoring

**RabbitMQ Management UI:**
```
http://localhost:15672
Username: transcendence
Password: transcendence_dev
```

**Check Queues:**
- Message rates
- Queue lengths
- Consumer status

---

## Best Practices

### 1. Event Design
✅ Events are immutable facts
✅ Include all necessary data (avoid lookups)
✅ Version events (`user.registered.v1`)
✅ Keep events small and focused

### 2. Error Handling
✅ Implement dead letter queues
✅ Retry with exponential backoff
✅ Log all event processing failures
✅ Monitor queue depths

### 3. Testing
✅ Unit test domain logic
✅ Integration test event flow
✅ E2E test critical paths
✅ Mock RabbitMQ for unit tests

### 4. Performance
✅ Use message prefetch limits
✅ Batch process events when possible
✅ Monitor event processing time
✅ Scale consumers horizontally

---

## Next Steps

1. ✅ **Structure Created**: All services follow hexagonal architecture
2. ⏭️ **Implement Messaging**: Fill in RabbitMQ infrastructure files
3. ⏭️ **Define Events**: Complete event contracts in shared-messaging
4. ⏭️ **Implement Use Cases**: Build business logic in each service
5. ⏭️ **Add Event Handlers**: Implement cross-service communication
6. ⏭️ **Write Tests**: Unit, integration, and E2E tests
7. ⏭️ **Deploy**: Docker Compose → Production

---

## Resources

- **Hexagonal Architecture**: https://alistair.cockburn.us/hexagonal-architecture/
- **RabbitMQ Documentation**: https://www.rabbitmq.com/documentation.html
- **Microservices Patterns**: https://microservices.io/patterns/
- **PNPM Workspaces**: https://pnpm.io/workspaces
- **Docker Compose**: https://docs.docker.com/compose/

---

**Questions? Issues?**
Each team member should focus on their assigned service. For cross-service concerns (events, infrastructure), coordinate in team meetings.
