# Transcendence 🎮

A real-time multiplayer Pong game with event-driven microservices architecture built by 42 Network students.

**Goal:** _< 30s from page-load → fair online match._

---

## 🏗️ Architecture

This project implements **Hexagonal Architecture (Ports & Adapters)** with **Event-Driven Microservices** using **RabbitMQ** for asynchronous communication.

### Architecture Diagram

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
         └────────┴────┬─────┴────────────┘
                       │
              ┌────────▼─────────┐
              │     RabbitMQ     │
              │  Event Messaging │
              │      :5672       │
              └──────────────────┘
                       │
         ┌─────────────┼─────────────┐
         │             │             │
    ┌────▼────┐  ┌────▼────┐  ┌────▼────┐
    │ SQLite  │  │  Redis  │  │  Vault  │
    │   DB    │  │  Cache  │  │ :8200   │
    └─────────┘  └─────────┘  └─────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** v22+ ([Download](https://nodejs.org/))
- **Docker Desktop** ([Download](https://www.docker.com/))
- **pnpm** (installed automatically if missing)

### Docker Canonical Setup (recommended)

1) Prepare env files and SSL certs:
```bash
make setup
```
2) Seed Vault (required for internal API key/JWT; OAuth values are optional):
```bash
make seed
```
If you keep secrets in a private repo, you can copy them in one shot:
```bash
SEED_SOURCE=/path/to/private/secrets.env make seed
```
The private file only needs `OAUTH_42_CLIENT_ID` and `OAUTH_42_CLIENT_SECRET` (optional `OAUTH_42_REDIRECT_URI` if you are not using the default).
You only need to rerun `make seed` if you removed the Vault volume or changed the OAuth values.
3) Start everything in Docker:
```bash
make dev-up
```
Note: `make dev-up` runs `make setup` automatically but does not run `make seed`.

### Start All Services (host dev)

```bash
# Start all services in development mode
pnpm dev:all
```

### Run Everything in Docker

```bash
docker compose up --build
```

This command builds every workspace image, installs dependencies inside the `pnpm-install` helper container, and starts the API Gateway, frontend, shared packages, and infrastructure services on the `transcendence` Docker network. Source code is hot-reloaded through bind mounts, so editing files locally immediately refreshes the running containers.

If `infrastructure/vault/.seed.env` is missing, copy `infrastructure/vault/.seed.env.example` and fill in `OAUTH_42_CLIENT_ID` and `OAUTH_42_CLIENT_SECRET` (optional `OAUTH_42_REDIRECT_URI` if you are not using the default). This file is gitignored by default.

**Key endpoints when running inside Docker:**
- 🌐 API Gateway: `http://localhost:3000`
- 🖥️ Frontend SPA: `http://localhost:5173`
- 🐰 RabbitMQ UI: `http://localhost:15672` (transcendence/transcendence_dev)
- 🔐 Vault: `http://localhost:8200`
- 📈 Grafana: `http://localhost:3300`
- 📊 Kibana: `http://localhost:5601`

All backend services (user, game, chat, tournament) listen on their usual ports inside the `transcendence` Docker network (`http://user-service:3001`, etc.) and are routed publicly through the API Gateway.

### Start Individual Services

```bash
pnpm dev:user          # User Service
pnpm dev:game          # Game Service
pnpm dev:chat          # Chat Service
pnpm dev:tournament    # Tournament Service
pnpm dev:gateway       # API Gateway
```

---

## 📁 Project Structure

```
transcendence/
├── services/                      # Microservices
│   ├── user-service/              # Authentication, profiles, 2FA
│   │   ├── domain/                # Business entities & logic
│   │   ├── application/           # Use cases
│   │   └── infrastructure/
│   │       ├── messaging/         # RabbitMQ integration
│   │       ├── database/          # SQLite repositories
│   │       └── http/              # HTTP controllers
│   ├── game-service/              # Real-time Pong gameplay
│   ├── chat-service/              # WebSocket chat rooms
│   └── tournament-service/        # Tournament brackets
│
├── packages/                      # Shared Kernel
│   ├── shared-messaging/          # Integration event contracts
│   ├── shared-utils/              # Utilities (Vault helper, response builders)
│   └── shared-validation/         # Input validation
│
├── infrastructure/
│   ├── api-gateway/               # Request routing, rate limiting
│   └── vault/                     # HashiCorp Vault setup
│
└── docs/                          # Documentation
    ├── HEXAGONAL-ARCHITECTURE.md  # Architectural guide
    ├── ARCHITECTURE.md            # Project structure
    └── VAULT-QUICK-GUIDE.md       # Vault overview
```

### Service Architecture (Hexagonal)

Each service follows the same pattern:

```
service/
├── domain/                # Core business logic
│   ├── entities/          # Domain entities
│   ├── events/            # Domain events
│   ├── repositories/      # Repository interfaces
│   └── value-objects/     # Value objects
│
├── application/           # Use cases & orchestration
│   ├── use-cases/         # Business use cases
│   ├── services/          # Application services
│   └── dto/               # Data transfer objects
│
└── infrastructure/        # External adapters
    ├── messaging/         # Event-driven messaging
    │   ├── RabbitMQConnection.ts
    │   ├── RabbitMQPublisher.ts
    │   ├── RabbitMQConsumer.ts
    │   └── handlers/      # Integration event handlers
    ├── database/          # Database repositories
    └── http/              # HTTP controllers
```

---

## 🎯 Event-Driven Architecture

Services communicate asynchronously via **RabbitMQ** using integration events.

### Event Flow Example

```
User Registration Flow:

1. User Service → Publishes UserRegisteredIntegrationEvent
2. RabbitMQ → Routes event to subscribed queues
3. Game Service → Handles event (creates player profile)
4. Chat Service → Handles event (creates chat profile)
5. Tournament Service → Handles event (enables registration)
```

### Integration Events

**User Events:**
- `UserRegisteredIntegrationEvent`
- `UserProfileUpdatedIntegrationEvent`

**Game Events:**
- `GameStartedIntegrationEvent`
- `GameFinishedIntegrationEvent`
- `PlayerJoinedIntegrationEvent`

**Chat Events:**
- `MessageSentIntegrationEvent`
- `UserJoinedChatIntegrationEvent`

**Tournament Events:**
- `TournamentCreatedIntegrationEvent`
- `TournamentStartedIntegrationEvent`
- `TournamentFinishedIntegrationEvent`

---

## 🔐 Security Features

### HashiCorp Vault Integration

All sensitive data is stored in **Vault**, not in environment variables or code:

- 🔑 **JWT signing keys** - Authentication tokens
- 🔐 **OAuth credentials** - Google, GitHub login
- 🗄️ **Database credentials** - Connection strings
- 🎮 **Game configuration** - Server settings
- 💬 **Chat configuration** - Rate limits
- 📧 **Email service** - SMTP credentials
- 🛠️ **API keys** - External services

**Why Vault?**
- ✅ Centralized secret management
- ✅ Encrypted storage
- ✅ Audit logging
- ✅ Easy secret rotation
- ✅ Fine-grained access control
- ✅ Never commit secrets to Git

📖 **Learn More:** [VAULT-QUICK-GUIDE.md](./VAULT-QUICK-GUIDE.md)

### Other Security Features

- 🛡️ **ModSecurity WAF** - Protection against common attacks
- 🚦 **Rate Limiting** - Prevent abuse and DDoS
- 🔒 **2FA Support** - Two-factor authentication
- 🔑 **JWT Authentication** - Stateless sessions
- 📝 **Input Validation** - Schema-based validation
- 🌐 **CORS Protection** - Cross-origin control

---

## 🧪 Development

### Available Commands

```bash
# Development
pnpm dev:all           # Start all services
pnpm dev:user          # Start user service
pnpm dev:game          # Start game service
pnpm dev:chat          # Start chat service
pnpm dev:tournament    # Start tournament service

# Build & Test
pnpm build             # Build all services
pnpm test              # Run all tests
pnpm lint              # Lint code

# Infrastructure
docker compose up -d rabbitmq vault redis   # Start infrastructure
docker compose logs -f [service]            # View logs
docker compose down                         # Stop all services
```

### Vault Commands

```bash
# Validate Vault integration
bash infrastructure/vault/scripts/validate-integration.sh

# Check Vault health
curl http://localhost:8200/v1/sys/health

# View all secrets (dev only)
bash infrastructure/vault/scripts/test-vault-system.sh
```

### RabbitMQ Management

Access the RabbitMQ Management UI:
- **URL:** http://localhost:15672
- **Username:** transcendence
- **Password:** transcendence_dev

Monitor:
- Message rates
- Queue lengths
- Consumer status
- Exchange bindings

### Logs & ELK (optional)

- Copy `.env.example` to `.env` and adjust `LOG_DIR/HOST_LOG_DIR`, `RABBITMQ_*`, and ELK image/ports to match your setup.
- Services emit JSON logs to `${HOST_LOG_DIR}` (default `data/logs`); `LOG_PRETTY=true` keeps console human-friendly while files stay JSON for shipping.
- Start ELK when needed: `docker compose up -d elasticsearch logstash kibana filebeat` (reads the same `.env` source of truth).
- Kibana: http://localhost:5601 (create index pattern `transcendence-*`).
- Filebeat tails `${HOST_LOG_DIR}/*.log` and ships to Logstash → Elasticsearch.

---

## 📦 Technology Stack

### Backend
- **Node.js** v22+ - Runtime environment
- **TypeScript** - Type-safe JavaScript
- **Fastify** - High-performance web framework
- **Socket.IO** - WebSocket communication
- **Pino** - Fast JSON logger

### Messaging & Data
- **RabbitMQ** - Event-driven messaging
- **SQLite** - Persistent data storage
- **Redis** - Cache and session storage

### Security & Infrastructure
- **HashiCorp Vault** - Secret management
- **ModSecurity + Nginx** - Web Application Firewall
- **Docker** - Containerization

### Development Tools
- **pnpm** - Fast package manager
- **ESLint** - Code linting
- **Vitest** - Unit testing
- **tsx** - Fast TypeScript execution

---

## 📚 Documentation

### Essential Guides
- 🏗️ **[docs/HEXAGONAL-ARCHITECTURE.md](./docs/HEXAGONAL-ARCHITECTURE.md)** - Complete architectural guide
- 🔐 **[VAULT-QUICK-GUIDE.md](./VAULT-QUICK-GUIDE.md)** - Vault overview (3 min)

### Architecture Resources
- **Hexagonal Architecture:** Clear separation of concerns
- **Event-Driven:** Loose coupling between services
- **Microservices:** Independent deployment & scaling
- **Domain-Driven Design:** Business logic first

---

## 👥 Team Collaboration

### Recommended Task Distribution (5 Developers)

```
Developer 1: User Service
├─ Authentication & Authorization
├─ Profile Management
└─ Events: UserRegistered, UserUpdated

Developer 2: Game Service
├─ Real-time Pong Gameplay
├─ WebSocket Management
└─ Events: GameStarted, GameFinished

Developer 3: Chat Service
├─ Real-time Messaging
├─ Chat Rooms
└─ Events: MessageSent, UserJoined

Developer 4: Tournament Service
├─ Tournament Creation
├─ Bracket Generation
└─ Events: TournamentCreated, TournamentStarted

Developer 5: Infrastructure & DevOps
├─ API Gateway
├─ Docker Orchestration
└─ Monitoring & CI/CD
```

### Git Workflow

1. **Clone repository**
   ```bash
   git clone <repository-url>
   cd transcendence
   ```

2. **Run setup**
   ```bash
   make setup
   make seed
   make dev-up
   ```

3. **Create feature branch**
   ```bash
   git checkout -b feature/your-feature
   ```

4. **Develop & test**
   ```bash
   pnpm dev:all
   pnpm test
   pnpm lint
   ```

5. **Commit with conventional commits**
   ```bash
   git commit -m "feat: add new feature"
   git commit -m "fix: resolve bug"
   ```

---

## 🐛 Troubleshooting

### Services won't start - Port in use

```bash
# Linux/Mac/WSL
pkill -f tsx

# Or kill specific ports
lsof -ti:3000,3001,3002,3003,3004 | xargs kill -9

# Windows
.\stop-services.bat
```

### RabbitMQ connection issues

```bash
# Check RabbitMQ is running
docker ps | grep rabbitmq

# Restart RabbitMQ
docker compose restart rabbitmq

# Check logs
docker compose logs rabbitmq
```

### Vault issues

```bash
# Check Vault health
curl http://localhost:8200/v1/sys/health

# Restart Vault
docker compose restart vault

# Re-initialize secrets
bash infrastructure/vault/scripts/setup-secrets-dev.sh
```

### Docker issues

```bash
# Check Docker is running
docker info

# Start infrastructure
docker compose up -d rabbitmq vault redis

# View all containers
docker ps -a
```

---

## 🤝 Contributing

### Code Standards

- ✅ Use **TypeScript** with strict mode
- ✅ Follow **Hexagonal Architecture** patterns
- ✅ Write **unit tests** for new features
- ✅ Use **Pino logger** for logging
- ✅ Validate inputs with **shared-validation**
- ✅ Publish **integration events** for cross-service communication
- ✅ Never commit **secrets** or **database files**
- ✅ Use **conventional commits** format

### Development Best Practices

1. **Domain First**: Implement business logic in domain layer
2. **Test Coverage**: Write tests for use cases
3. **Event Contracts**: Define events in shared-messaging
4. **Loose Coupling**: Communicate via events, not direct calls
5. **Documentation**: Update docs for significant changes

---

## 🎯 Project Goals

- ⚡ **Performance** - < 30s from load to match
- 🔐 **Security** - Enterprise-grade secret management
- 🏗️ **Scalability** - Microservices architecture
- 🧪 **Testability** - Hexagonal architecture
- 📈 **Maintainability** - Clean code principles
- 🤝 **Collaboration** - Clear documentation
- 🔄 **Resilience** - Event-driven communication

---

## 📄 License

This project is part of the 42 School curriculum.

---

## 🚀 Getting Started for New Team Members

1. **Read** [docs/HEXAGONAL-ARCHITECTURE.md](./docs/HEXAGONAL-ARCHITECTURE.md)
2. **Run** setup script
3. **Start** development with `pnpm dev:all`
4. **Choose** your service and start implementing!

---

**Built with ❤️ by the Transcendence Team**

_Questions? Check [HEXAGONAL-ARCHITECTURE.md](./docs/HEXAGONAL-ARCHITECTURE.md)!_
