# Transcendence - Microservices Architecture

A real-time Pong-style game platform built with microservices architecture and hexagonal design patterns.

## Architecture Overview

```
transcendence/
├── packages/                    # Shared libraries
│   ├── shared-types/           # TypeScript type definitions
│   ├── shared-utils/          # Common utilities and helpers
│   └── shared-validation/     # Validation schemas (Zod)
├── services/                   # Microservices
│   ├── user-service/          # User management & authentication
│   ├── game-service/          # Game logic & real-time gameplay
│   ├── chat-service/          # Real-time chat functionality
│   └── tournament-service/    # Tournament organization
├── infrastructure/            # Infrastructure services
│   ├── api-gateway/          # API Gateway & routing
│   ├── vault/               # Secrets management
│   └── nginx-modsecurity/   # Security & reverse proxy
└── docker-compose.yml       # Service orchestration
```

## 🏗️ Service Architecture (Hexagonal/Ports & Adapters)

Each service follows hexagonal architecture:

```
service/
├── src/
│   ├── domain/              # Core business logic
│   │   ├── entities.ts      # Domain entities
│   │   └── ports.ts         # Interface definitions
│   ├── application/         # Use cases (business logic)
│   │   ├── *.usecase.ts     # Use case implementations
│   └── adapters/           # External interfaces
│       ├── persistence/     # Database adapters
│       ├── external/       # Third-party services
│       └── web/           # HTTP/API controllers
└── server.ts              # Main server & DI container
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- pnpm 8+
- Docker & Docker Compose

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Development Mode

#### Start all services individually:
```bash
# Terminal 1 - User Service
pnpm dev:user

# Terminal 2 - Game Service  
pnpm dev:game

# Terminal 3 - Chat Service
pnpm dev:chat

# Terminal 4 - Tournament Service
pnpm dev:tournament

# Terminal 5 - API Gateway
pnpm dev:gateway
```

#### Or start all services in parallel:
```bash
pnpm dev:all
```

### 3. Using Docker Compose
```bash
# Start all services with infrastructure
pnpm docker:up

# View logs
pnpm docker:logs

# Stop all services
pnpm docker:down
```

## 🌐 Service Endpoints

### API Gateway (Port 3000)
- **Health Check**: `GET /health`
- **API Docs**: `GET /api/docs`

### User Service (Port 3001)
- **Get Profile**: `GET /api/users/me`
- **Update Profile**: `PATCH /api/users/me`
- **Upload Avatar**: `POST /api/users/me/avatar`
- **Generate 2FA**: `POST /api/users/me/2fa/generate`

### Game Service (Port 3002)
- **List Games**: `GET /api/games`
- **Create Game**: `POST /api/games`

### Chat Service (Port 3003)
- **List Rooms**: `GET /api/chat/rooms`
- **Send Message**: `POST /api/chat/messages`

### Tournament Service (Port 3004)
- **List Tournaments**: `GET /api/tournaments`
- **Create Tournament**: `POST /api/tournaments`

## 🛠️ Development Workflow

### Adding a New Feature

1. **Update shared types** (if needed):
   ```bash
   # Edit packages/shared-types/src/index.ts
   pnpm --filter @transcendence/shared-types build
   ```

2. **Implement in service**:
   ```bash
   # Example: Adding user feature
   cd services/user-service
   
   # 1. Define domain entities/ports
   # 2. Implement use cases
   # 3. Add adapters (persistence, external)
   # 4. Update web controller
   # 5. Test the feature
   ```

3. **Update API Gateway** (if new routes):
   ```bash
   # Edit infrastructure/api-gateway/src/server.ts
   ```

### Working with Shared Packages

```bash
# Build all shared packages
pnpm --filter "./packages/*" build

# Add dependency to a service
cd services/user-service
pnpm add @transcendence/shared-validation

# Update shared package
cd packages/shared-utils
# Make changes...
pnpm build
```

## 🧪 Testing

```bash
# Test all services
pnpm test

# Test specific service
pnpm --filter @transcendence/user-service test

# Test with watch mode
pnpm --filter @transcendence/user-service test:watch
```

## 📦 Building & Deployment

```bash
# Build all services
pnpm build

# Build specific service
pnpm --filter @transcendence/user-service build

# Production build with Docker
docker-compose -f docker-compose.prod.yml up --build
```

## 🔒 Security Features

- **ModSecurity WAF**: Web application firewall
- **Rate Limiting**: API rate limiting via gateway
- **Secrets Management**: HashiCorp Vault integration
- **2FA Authentication**: TOTP-based two-factor auth

## 📊 Monitoring

- **Prometheus**: Metrics collection (Port 9090)
- **Grafana**: Dashboards (Port 3001)
- **Health Checks**: `/health` endpoints on all services

## 🗄️ Data Storage

- **SQLite**: Development databases (per service)
- **PostgreSQL**: Production database (optional)
- **Redis**: Caching and session storage

## 🔄 Service Communication

Services communicate via:
- **HTTP APIs**: Through the API Gateway
- **WebSockets**: Real-time features (game, chat)
- **Message Queue**: Future implementation for async communication

## 📝 Environment Variables

Create `.env` files for each service:

```bash
# services/user-service/.env
USER_SERVICE_PORT=3001
USER_SERVICE_DB_PATH=./user-service.db
UPLOAD_DIR=./uploads
FORTY_TWO_CLIENT_ID=your_client_id
FORTY_TWO_CLIENT_SECRET=your_client_secret
```

## 🤝 Contributing

1. Follow hexagonal architecture patterns
2. Write tests for use cases
3. Update shared types when needed
4. Document API changes
5. Test service integration

## 📚 Tech Stack

- **Runtime**: Node.js + TypeScript
- **Web Framework**: Fastify
- **Database**: SQLite (dev) / PostgreSQL (prod)
- **Validation**: Zod
- **Authentication**: JWT + 2FA (TOTP)
- **Real-time**: Socket.IO
- **Containerization**: Docker
- **Monitoring**: Prometheus + Grafana
