# 🏗️ Architecture Overview

Transcendence is built with **microservices architecture** using **hexagonal design patterns** for maximum maintainability, scalability, and team collaboration.

## 🎯 Key Architectural Principles

### 1. **Microservices Architecture**
- **Independent Deployment**: Each service can be deployed separately
- **Technology Diversity**: Services can use different technologies
- **Fault Isolation**: Failure in one service doesn't crash others
- **Team Autonomy**: Each team owns their service completely

### 2. **Hexagonal Architecture (Ports & Adapters)**
- **Domain-Driven**: Business logic at the center
- **Dependency Inversion**: External dependencies point inward
- **Testability**: Easy to test business logic in isolation
- **Flexibility**: Easy to change external adapters

### 3. **Event-Driven Communication**
- **Loose Coupling**: Services communicate via events
- **Asynchronous**: Non-blocking communication
- **Scalability**: Easy to add new consumers
- **Reliability**: Message persistence and retry mechanisms

## 🏛️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   API Gateway (:3000)                        │
│             (Rate Limiting, Authentication)                  │
└────────┬────────┬──────────┬──────────┬─────────────────────┘
         │        │          │          │
    ┌────▼───┐ ┌─▼────┐ ┌───▼───┐ ┌───▼─────────┐
    │  User  │ │ Game │ │ Chat  │ │ Tournament  │
    │:3001   │ │:3002 │ │:3003  │ │   :3004     │
    └────┬───┘ └──┬───┘ └───┬───┘ └──────┬──────┘
         │        │          │            │
         └────────┼──────────┼────────────┘
                  │          │
            ┌─────▼──────────▼─────┐
            │     RabbitMQ         │
            │  (Message Broker)    │
            └──────────────────────┘
```

## 🔧 Service Responsibilities

### 🔑 API Gateway (Port 3000)
- **Route Management**: Forward requests to appropriate services
- **Authentication**: JWT token validation
- **Rate Limiting**: Prevent API abuse
- **CORS Handling**: Cross-origin request management

### 👤 User Service (Port 3001)
- **Authentication**: Login, registration, JWT management
- **User Profiles**: Profile management and preferences
- **2FA/OAuth**: Two-factor authentication and OAuth integration
- **User Events**: Publishes user lifecycle events

### 🎮 Game Service (Port 3002)
- **Real-time Gameplay**: WebSocket-based Pong game
- **Game State**: Game logic and state management
- **Match History**: Store and retrieve game results
- **Matchmaking**: Player pairing and game creation

### 💬 Chat Service (Port 3003)
- **Real-time Messaging**: WebSocket-based chat
- **Chat Rooms**: Public and private chat rooms
- **Direct Messages**: One-on-one messaging
- **Message History**: Persistent message storage

### 🏆 Tournament Service (Port 3004)
- **Tournament Management**: Create and manage tournaments
- **Bracket Generation**: Tournament bracket creation
- **Leaderboards**: Rankings and statistics
- **Tournament Events**: Tournament lifecycle events

## 📡 Event-Driven Communication

Services communicate asynchronously through **RabbitMQ**:

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│ User Service │────────▶│   RabbitMQ   │────────▶│ Game Service │
└──────────────┘         └──────────────┘         └──────────────┘
      Publish               Exchange/Queue            Subscribe
  UserRegistered                                   Handle Event
```

### Event Examples
- **UserRegistered** → Game Service creates player profile
- **GameFinished** → Tournament Service updates bracket
- **TournamentStarted** → Chat Service creates tournament room

## 🔒 Security Architecture

### Authentication Flow
1. **Client** sends credentials to **API Gateway**
2. **API Gateway** forwards to **User Service**
3. **User Service** validates and returns JWT
4. **API Gateway** returns JWT to client
5. **Subsequent requests** include JWT in headers

### Secrets Management
- **HashiCorp Vault**: Centralized secret storage
- **Database Credentials**: Stored in Vault
- **JWT Secrets**: Rotated automatically
- **API Keys**: Third-party service keys

## 🗄️ Data Architecture

### Database Strategy
- **Service-Specific Databases**: Each service owns its data
- **SQLite**: Development and testing
- **PostgreSQL**: Production deployment
- **Event Store**: Message persistence in RabbitMQ

### Data Consistency
- **Eventual Consistency**: Via event-driven updates
- **Saga Pattern**: For complex multi-service transactions
- **Idempotency**: Events can be safely replayed

## 🔄 Development Architecture

### Shared Packages
```
packages/
├── shared-utils/         # Common utilities, response builders
├── shared-validation/    # Zod validation schemas
└── shared-messaging/     # Event contracts
```

### Code Organization (per service)
```
service/
├── domain/              # Business logic
├── application/         # Use cases
└── infrastructure/      # External adapters
```

## 📊 Monitoring & Observability

### Health Checks
- **Service Health**: `/health` endpoint per service
- **Dependency Health**: Database and message queue status
- **Gateway Health**: Aggregated system health

### Logging
- **Structured Logging**: JSON format with correlation IDs
- **Service Identification**: Clear service labeling
- **Error Tracking**: Centralized error aggregation

## 🚀 Deployment Architecture

### Development
- **Local Development**: `pnpm dev:all`
- **Docker Compose**: Full local environment
- **Hot Reload**: Automatic code reloading

### Production
- **Containerization**: Docker for each service
- **Orchestration**: Docker Compose or Kubernetes
- **Load Balancing**: Multiple instances per service
- **Database**: PostgreSQL with replication

## 📈 Scalability Patterns

### Horizontal Scaling
- **Stateless Services**: Easy to replicate
- **Load Balancing**: Distribute traffic
- **Database Sharding**: Split data across instances

### Performance Optimization
- **Caching**: Redis for session data
- **Connection Pooling**: Database connections
- **Message Prefetch**: RabbitMQ optimization

---

## 🎯 Architecture Benefits

✅ **Team Independence**: Each team can work autonomously
✅ **Technology Flexibility**: Choose the right tool for each job
✅ **Fault Tolerance**: Isolated failures
✅ **Scalability**: Scale services independently
✅ **Maintainability**: Clear separation of concerns
✅ **Testability**: Easy to test in isolation

## 📚 Next Steps

- [Microservices Deep Dive](./MICROSERVICES.md)
- [Hexagonal Architecture Guide](./HEXAGONAL.md)
- [Event-Driven Messaging](./MESSAGING.md)
- [Security Patterns](./SECURITY.md)
