# User Service

## Architecture Overview
The service follows Hexagonal (Ports & Adapters) architecture. The domain layer defines entities, value objects, and ports. Application use cases implement inbound ports and coordinate DTO ↔ domain conversions. Infrastructure adapters (HTTP controllers, SQLite repositories, external clients) implement outbound ports and are injected at runtime via `server.ts`.

```
HTTP Controller -> DTO Mapper -> Use Case (Inbound Port)
Use Case -> Outbound Ports -> Repository/Adapter
Repository -> SQLite / External Service
```

## Layer Responsibilities
- **Domain (`src/domain`)**: Pure TypeScript entities, value objects, domain services, and port interfaces. No infrastructure imports.
- **Application (`src/application`)**: Use cases (implement inbound ports), DTOs, and mappers. Orchestrate workflows and enforce business policies by composing domain/value objects.
- **Infrastructure (`src/infrastructure`)**: HTTP controllers, Fastify routes, SQLite repositories, external service clients, and adapters (e.g., password hasher). Provides concrete implementations of outbound ports.

## Dependency Rules
1. Domain is independent; nothing imports from infrastructure.
2. Application imports domain entities/value objects/ports but never infrastructure.
3. Infrastructure depends on application/domain via ports and DTOs.
4. All cross-layer interactions go through DTOs and ports (no domain entities leaking into controllers).

## Testing Strategy
- **Domain unit tests** (`test/unit/domain/**`): Validate value objects, entities, and domain services with no I/O.
- **Application unit tests** (`test/unit/application/use-cases/**`): Mock repositories/services to exercise every use case.
- **Integration tests** (`test/integration/infrastructure/repositories/**`): Use the shared `test/helpers/test-database.ts` helper to run SQLite repositories against an in-memory database.
- Vitest currently cannot spawn workers in this sandbox; run `pnpm --filter @transcendence/user-service test -- run` locally/CI to execute the full suite.

## Messaging & Integration Events
- The service publishes user-centric integration events through RabbitMQ (topic exchange).
- Configure messaging via environment variables:
  - `RABBITMQ_URL` (or `RABBITMQ_URI`): AMQP connection string, defaults to `amqp://guest:guest@rabbitmq:5672`.
  - `RABBITMQ_EXCHANGE`: topic exchange name, defaults to `transcendence.events`.
  - `RABBITMQ_QUEUE_PREFIX`: optional prefix for service-specific queues (defaults to `user-service`).
- `DeleteUserUseCase` now emits the `user.deleted` event after a successful transaction so downstream services (e.g., Game Service) can react by cleaning up active matches or cached state.

## Adding a New Use Case
1. **Define DTOs** in `src/application/dto` (input and output) with readonly fields.
2. **Add an inbound port** under `src/domain/ports/inbound` describing the contract.
3. **Implement the use case** in `src/application/use-cases/**`, ensuring it implements the inbound port and only consumes outbound ports.
4. **Create/Update mappers** if new DTO ↔ domain conversions are needed.
5. **Wire dependencies** in `src/server.ts` (instantiate repositories/adapters and pass them to the use case).
6. **Expose via controllers/routes** (infrastructure layer) using DTOs for request/response.
7. **Write tests**: mock-based unit test for the use case plus integration tests if new repositories/adapters are introduced.
