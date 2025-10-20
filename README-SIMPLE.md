# Transcendence 🏓

**A real-time multiplayer Pong game with microservices architecture** - PFE Project

**Goal:** < 30s from page-load → fair online match

---

## 🎯 What This Project Demonstrates

✅ **Microservices Architecture** - 5 independent services working together  
✅ **Real-time Communication** - WebSocket for live game/chat  
✅ **Secure Secret Management** - HashiCorp Vault integration  
✅ **Modern Stack** - TypeScript, Fastify, Docker  
✅ **Clean Architecture** - Hexagonal/Ports & Adapters pattern  

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────┐
│          API Gateway (:3000)                       │
│      (Routing, Rate Limiting)                      │
└──────┬──────┬──────────┬──────────┬────────────────┘
       │      │          │          │
  ┌────▼──┐ ┌▼────┐ ┌───▼───┐ ┌───▼─────────┐
  │ User  │ │Game │ │ Chat  │ │ Tournament  │
  │:3001  │ │:3002│ │:3003  │ │   :3004     │
  └───┬───┘ └─┬───┘ └───┬───┘ └──────┬──────┘
      │       │         │            │
  ┌───▼───────▼─────────▼────────────▼──────┐
  │   SQLite (User/Tournament)              │
  │   Redis (Game/Chat)                     │
  └─────────────────┬───────────────────────┘
                    │
           ┌────────▼─────────┐
           │ HashiCorp Vault  │
           │  (Secrets :8200) │
           └──────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** v18+ ([Download](https://nodejs.org/))
- **Docker Desktop** ([Download](https://www.docker.com/))
- **pnpm** (installed automatically)

### One-Command Setup 🎯

**Linux/Mac:**
```bash
bash setup.sh
```

**Windows:**
```powershell
powershell -ExecutionPolicy Bypass -File setup.ps1
```

This will:
- ✅ Install dependencies
- ✅ Start Vault and Redis
- ✅ Configure secrets
- ✅ Build all services

### Start All Services

```bash
pnpm run dev:all
```

**All services will be running:**
- 🌐 API Gateway: `http://localhost:3000`
- 👤 User Service: `http://localhost:3001`
- 🎮 Game Service: `http://localhost:3002`
- 💬 Chat Service: `http://localhost:3003`
- 🏆 Tournament Service: `http://localhost:3004`
- 🔐 Vault UI: `http://localhost:8200/ui` (Token: `dev-root-token`)

**Check Health:**
```bash
curl http://localhost:3000/health
```

---

## 📂 Project Structure

```
transcendence/
├── services/                    # Microservices
│   ├── user-service/           # Authentication, profiles
│   ├── game-service/           # Real-time Pong game
│   ├── chat-service/           # WebSocket chat
│   └── tournament-service/     # Tournament management
│
├── infrastructure/
│   ├── api-gateway/            # Request routing
│   └── vault/                  # Secret management
│       ├── scripts/
│       │   └── setup-secrets-dev-simple.sh  ⭐ SIMPLIFIED
│       └── config/
│
├── packages/                   # Shared libraries
│   ├── shared-types/          # TypeScript interfaces
│   ├── shared-utils/          # Common utilities + Vault client
│   └── shared-validation/     # Input validation
│
└── docs/                      # Documentation
```

---

## 🔐 Vault Integration (Simplified!)

### Why Vault?
- ✅ **No hardcoded secrets** in code
- ✅ **Centralized management** - all secrets in one place
- ✅ **Professional approach** - industry standard

### What's Stored in Vault?
1. **Database configs** (SQLite paths, Redis connection)
2. **JWT signing keys** (for authentication)
3. **Game settings** (WebSocket secrets, timeouts)
4. **Chat settings** (message limits, retention)

### How It Works
```typescript
// Services automatically connect to Vault on startup
const vault = createUserServiceVault();
await vault.initialize();

// Get secrets at runtime (not hardcoded!)
const jwtConfig = await vault.getJWTConfig();
const dbConfig = await vault.getDatabaseConfig();
```

**Learn more:** See [VAULT_SIMPLE_GUIDE.md](./VAULT_SIMPLE_GUIDE.md)

---

## 💻 Development

### Available Commands

```bash
# Start all services
pnpm run dev:all

# Start individual service
pnpm run dev:user
pnpm run dev:game
pnpm run dev:chat
pnpm run dev:tournament
pnpm run dev:gateway

# Build all
pnpm run build

# Run tests
pnpm test

# Lint code
pnpm run lint
```

### Stop Services

```bash
# Kill all node processes
pkill -f tsx

# Or on Windows
.\stop-services.bat
```

---

## 🧪 Testing Vault Integration

```bash
# Check Vault health
curl http://localhost:8200/v1/sys/health

# View secrets (dev only!)
export VAULT_ADDR=http://localhost:8200
export VAULT_TOKEN=dev-root-token
vault kv get secret/jwt/auth

# Re-setup secrets if needed
bash infrastructure/vault/scripts/setup-secrets-dev-simple.sh
```

---

## 🐛 Troubleshooting

### Services won't start - "Port already in use"
```bash
pkill -f tsx
# Or find specific process:
lsof -ti:3000,3001,3002,3003,3004 | xargs kill -9
```

### Vault connection fails
```bash
# Check Vault is running
docker ps | grep vault

# Restart Vault
docker restart vault-dev

# Re-setup secrets
export VAULT_ADDR=http://localhost:8200
export VAULT_TOKEN=dev-root-token
bash infrastructure/vault/scripts/setup-secrets-dev-simple.sh
```

### Database errors - "Cannot open database"
The database file is created automatically on first run. If you see errors:
```bash
# Check if services are running from correct directory
cd /home/your-project
pnpm run dev:all
```

---

## 📚 Technology Stack

### Backend
- **Node.js** v22 - Runtime
- **TypeScript** - Type safety
- **Fastify** - Fast web framework
- **Socket.io** - Real-time WebSocket

### Databases
- **SQLite** - User and Tournament data (simple, local)
- **Redis** - Game state and Chat (in-memory, fast)

### Infrastructure
- **HashiCorp Vault** - Secret management
- **Docker** - Containerization
- **pnpm** - Package manager

### Architecture
- **Hexagonal Architecture** (Ports & Adapters)
- **Microservices** - Independent, scalable services
- **Monorepo** - All code in one repository

---

## 🎓 For Your PFE Presentation

### Key Points to Highlight:

1. **Modern Architecture**
   - Microservices with API Gateway
   - Each service is independent
   - Clean separation of concerns

2. **Security Best Practices**
   - HashiCorp Vault for secrets
   - JWT authentication
   - No hardcoded credentials

3. **Real-time Features**
   - WebSocket for game and chat
   - Low-latency communication
   - Concurrent player support

4. **Code Quality**
   - TypeScript for type safety
   - Hexagonal architecture
   - Shared libraries for reusability

### Demo Flow:
1. Show all services starting: `pnpm run dev:all`
2. Show Vault UI with secrets: `http://localhost:8200/ui`
3. Show API Gateway health: `curl http://localhost:3000/health`
4. Show real-time game/chat functionality
5. Explain microservices communication

---

## 📄 Documentation

- 📘 [VAULT_SIMPLE_GUIDE.md](./VAULT_SIMPLE_GUIDE.md) - Vault explained simply
- 🏗️ [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) - Detailed architecture
- 🛠️ [docs/DEVELOPMENT_GUIDE.md](./docs/DEVELOPMENT_GUIDE.md) - Development guide
- 🌐 [docs/openapi.yaml](./docs/openapi.yaml) - API documentation

---

## 🤝 Contributing

This is a PFE (Final Year Project). For questions:
1. Check documentation above
2. Review code comments
3. Ask your team members

---

## 📊 Project Stats

- **5 Microservices** - User, Game, Chat, Tournament, API Gateway
- **3 Shared Packages** - Types, Utils, Validation
- **TypeScript** - 100% type-safe codebase
- **Vault Integration** - Enterprise-grade secret management
- **Real-time** - WebSocket for game and chat
- **Fast** - < 30s from load to match

---

**Built with ❤️ for PFE 2024-2025**

_Need help? Check [VAULT_SIMPLE_GUIDE.md](./VAULT_SIMPLE_GUIDE.md) or ask your team!_
