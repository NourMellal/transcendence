# 📁 Transcendence Project Structure Documentation

This document explains every file and directory in the microservices architecture to help the team understand the project organization.

## 🏗️ Root Directory Structure

```
transcendence/
├── packages/                    # Shared libraries (monorepo packages)
├── services/                   # Microservices (independent applications)
├── infrastructure/            # Infrastructure & DevOps services
├── docs/                      # Documentation
├── docker-compose.yml         # Multi-service orchestration
├── package.json              # Root workspace configuration
├── pnpm-workspace.yaml       # Workspace package definitions
├── tsconfig.json             # Root TypeScript configuration
├── eslint.config.cjs         # ESLint configuration for all packages
├── vitest.config.mjs         # Vitest testing configuration
├── README-microservices.md   # Main documentation
└── ARCHITECTURE.md           # This file
```

---

## 📦 Packages Directory (`/packages/`)

**Purpose**: Shared libraries used across multiple services to ensure consistency and avoid code duplication.

### `/packages/shared-types/`
**What it contains**: TypeScript interface definitions shared across all services.

```
packages/shared-types/
├── src/
│   └── index.ts              # All shared TypeScript interfaces
├── package.json             # Package dependencies & build scripts
├── tsconfig.json           # TypeScript compilation settings
└── dist/                   # Compiled JavaScript output (auto-generated)
```

**Key Files:**
- **`src/index.ts`**: Contains all shared interfaces:
  - `User` - User domain entity structure
  - `Session` - Authentication session structure  
  - `Game` - Game state and metadata
  - `ChatMessage` - Chat message structure
  - `Tournament` - Tournament data structure
  - `ApiResponse<T>` - Standardized API response format
  - `OAuth42Profile` - 42 School OAuth user data

**Used by**: All services that need consistent data structures.

### `/packages/shared-utils/`
**What it contains**: Common utility functions, error handling, and helper methods.

```
packages/shared-utils/
├── src/
│   └── index.ts              # Utility functions and error classes
├── package.json             # Dependencies (imports shared-types)
├── tsconfig.json           # TypeScript configuration
└── dist/                   # Compiled output
```

**Key Files:**
- **`src/index.ts`**: Contains utility functions:
  - `createSuccessResponse()` / `createErrorResponse()` - API response builders
  - `generateId()` / `generateSessionToken()` - ID generation utilities
  - `addDays()` / `addHours()` - Date manipulation helpers
  - `isValidEmail()` / `isValidUsername()` - Validation helpers
  - `getEnvVar()` / `getEnvVarAsNumber()` - Environment variable helpers
  - `AppError`, `ValidationError`, `NotFoundError` - Custom error classes

**Used by**: All services for consistent error handling and common operations.

### `/packages/shared-validation/`
**What it contains**: Zod validation schemas for request/response validation.

```
packages/shared-validation/
├── src/
│   └── index.ts              # Zod schemas and TypeScript type exports
├── package.json             # Dependencies (zod, shared-types)
├── tsconfig.json           # TypeScript configuration
└── dist/                   # Compiled output
```

**Key Files:**
- **`src/index.ts`**: Contains validation schemas:
  - `createUserSchema` / `updateUserSchema` - User data validation
  - `loginSchema` / `enable2FASchema` - Authentication validation
  - `paginationSchema` / `idSchema` - Common parameter validation
  - `imageUploadSchema` - File upload validation
  - `createGameSchema` / `sendMessageSchema` - Game/chat validation
  - Type exports: `CreateUserInput`, `UpdateUserInput`, etc.

**Used by**: All services for validating incoming requests and ensuring data integrity.

---

## 🚀 Services Directory (`/services/`)

**Purpose**: Independent microservices implementing business logic with hexagonal architecture.

### `/services/user-service/`
**What it does**: Handles user management, authentication, and profile operations.

```
services/user-service/
├── src/
│   ├── domain/                 # Core business logic (no external dependencies)
│   │   ├── entities.ts        # User domain entities and value objects
│   │   └── ports.ts           # Interface definitions (contracts)
│   ├── application/           # Use cases (business operations)
│   │   ├── get-user.usecase.ts
│   │   ├── update-profile.usecase.ts
│   │   └── generate-2fa.usecase.ts
│   ├── adapters/             # External world integration
│   │   ├── persistence/      # Database adapters
│   │   │   └── sqlite-user.repository.ts
│   │   ├── external/         # Third-party service adapters
│   │   │   ├── otp-2fa.service.ts
│   │   │   └── local-image-storage.service.ts
│   │   └── web/             # HTTP API adapters
│   │       └── user.controller.ts
│   └── server.ts            # Main application entry point
├── .env                     # Environment variables
├── package.json            # Service dependencies
├── tsconfig.json          # TypeScript configuration
└── user-service.db       # SQLite database file (auto-created)
```

**Key Files Explained:**

#### Domain Layer (`/src/domain/`)
- **`entities.ts`**: Core business entities
  - `User` interface - User data structure
  - `Session` interface - Authentication session
  - `UserId`, `Email`, `Username` value objects - Domain validation
  
- **`ports.ts`**: Interface contracts (hexagonal architecture)
  - `UserRepository` - Database operations interface
  - `TwoFAService` - 2FA operations interface
  - `ImageStorageService` - File storage interface
  - Use case interfaces: `GetUserUseCase`, `UpdateProfileUseCase`, etc.

#### Application Layer (`/src/application/`)
- **`get-user.usecase.ts`**: Retrieve user by ID
- **`update-profile.usecase.ts`**: Update user profile with validation
- **`generate-2fa.usecase.ts`**: Generate 2FA QR codes and secrets

#### Adapters Layer (`/src/adapters/`)

**Persistence (`/src/adapters/persistence/`)**
- **`sqlite-user.repository.ts`**: SQLite database implementation
  - Implements `UserRepository` interface
  - Handles CRUD operations for users
  - Database schema initialization

**External (`/src/adapters/external/`)**
- **`otp-2fa.service.ts`**: Two-factor authentication implementation
  - Uses `otplib` for TOTP generation
  - QR code generation with `qrcode` library
  
- **`local-image-storage.service.ts`**: File storage implementation
  - Saves uploaded images to local filesystem
  - Handles image deletion and URL generation

**Web (`/src/adapters/web/`)**
- **`user.controller.ts`**: HTTP API endpoints
  - `GET /api/users/me` - Get current user profile
  - `PATCH /api/users/me` - Update user profile
  - `POST /api/users/me/avatar` - Upload avatar image
  - `POST /api/users/me/2fa/generate` - Generate 2FA setup

#### Main Entry
- **`server.ts`**: Application bootstrap
  - Database connection setup
  - Dependency injection container
  - Fastify server configuration
  - Route registration
  - Error handling setup

### `/services/game-service/`
**What it does**: Manages game logic, real-time gameplay, and match history.

```
services/game-service/
├── src/
│   └── server.ts            # Basic server setup (placeholder)
├── package.json            # Dependencies (Socket.IO for real-time)
└── tsconfig.json          # TypeScript configuration
```

**Current State**: Basic placeholder with health check endpoint.
**Planned Features**: Game rooms, real-time Pong gameplay, matchmaking, scoring.

### `/services/chat-service/`
**What it does**: Real-time chat functionality between users.

```
services/chat-service/
├── src/
│   └── server.ts            # Basic server setup (placeholder)
├── package.json            # Dependencies (Socket.IO for real-time)
└── tsconfig.json          # TypeScript configuration
```

**Current State**: Basic placeholder with health check endpoint.
**Planned Features**: Chat rooms, message history, real-time messaging, user presence.

### `/services/tournament-service/`
**What it does**: Tournament organization and bracket management.

```
services/tournament-service/
├── src/
│   └── server.ts            # Basic server setup (placeholder)
├── package.json            # Service dependencies
└── tsconfig.json          # TypeScript configuration
```

**Current State**: Basic placeholder with health check endpoint.
**Planned Features**: Tournament creation, bracket generation, match scheduling.

---

## 🏛️ Infrastructure Directory (`/infrastructure/`)

**Purpose**: DevOps, security, and infrastructure services.

### `/infrastructure/api-gateway/`
**What it does**: Central entry point for all API requests, routing to appropriate services.

```
infrastructure/api-gateway/
├── src/
│   └── server.ts            # Gateway routing and middleware
├── package.json            # Dependencies (Fastify, proxy, CORS, rate limiting)
└── tsconfig.json          # TypeScript configuration
```

**Key Features:**
- **Route Proxying**: Routes `/api/users/*` to user-service, `/api/games/*` to game-service, etc.
- **CORS Handling**: Cross-origin request support
- **Rate Limiting**: API request throttling
- **Health Checks**: Monitors all service health
- **Request Logging**: Adds gateway headers to requests

### `/infrastructure/vault/` (Placeholder)
**What it will do**: Secrets management using HashiCorp Vault.
**Purpose**: Store API keys, database passwords, JWT secrets securely.

### `/infrastructure/nginx-modsecurity/` (Placeholder)
**What it will do**: Web Application Firewall and reverse proxy.
**Purpose**: Security filtering, SSL termination, load balancing.

---

## 🐳 Docker Configuration

### `docker-compose.yml`
**Purpose**: Orchestrates all services for development and production deployment.

**Services Defined:**
- **api-gateway**: Main entry point (port 3000)
- **user-service**: User management (port 3001)
- **game-service**: Game logic (port 3002)
- **chat-service**: Chat functionality (port 3003)
- **tournament-service**: Tournament management (port 3004)
- **redis**: Caching and session storage
- **postgres**: Production database
- **vault**: Secrets management
- **nginx-modsecurity**: Security layer
- **prometheus**: Metrics collection
- **grafana**: Monitoring dashboards

---

## 📋 Configuration Files

### `package.json` (Root)
**Purpose**: Workspace configuration and global scripts.

**Key Scripts:**
- `pnpm dev:user` - Start user service only
- `pnpm dev:all` - Start all services in parallel
- `pnpm build` - Build all packages and services
- `pnpm docker:up` - Start all services with Docker

### `pnpm-workspace.yaml`
**Purpose**: Defines which directories are workspace packages.
```yaml
packages:
  - "services/*"     # All microservices
  - "packages/*"     # All shared packages  
  - "infrastructure/*" # All infrastructure services
```

### `tsconfig.json` (Root)
**Purpose**: Base TypeScript configuration inherited by all packages.

---

## 🔄 Data Flow Example

Here's how a typical request flows through the architecture:

1. **Client Request**: `PATCH /api/users/me` (update profile)
2. **API Gateway**: Receives request, applies rate limiting, routes to user-service
3. **User Controller**: Validates request using shared-validation schemas
4. **Update Profile Use Case**: Business logic for profile updates
5. **User Repository**: Database operations using sqlite adapter
6. **Response**: Returns through same path with shared-utils response format

## 🛠️ Development Workflow

### Adding a New Feature
1. **Update shared types** if new data structures needed
2. **Add validation schemas** in shared-validation
3. **Implement domain logic** in appropriate service
4. **Add use cases** for new business operations
5. **Update adapters** (database, external services, web)
6. **Update API gateway** routing if needed
7. **Test integration** between services

### Running the Project
```bash
# Install all dependencies
pnpm install

# Build shared packages
pnpm --filter "./packages/*" build

# Start development servers
pnpm dev:all                    # All services
pnpm dev:user                   # User service only
pnpm dev:gateway               # API gateway only

# Production deployment
pnpm docker:up                 # All services with Docker
```

This architecture provides:
- ✅ **Clear separation of concerns**
- ✅ **Independent service deployment**
- ✅ **Shared code reusability**
- ✅ **Type safety across services**
- ✅ **Consistent error handling**
- ✅ **Scalable development workflow**
