# Transcendence 🏓# Transcendence 🏓



A real-time multiplayer Pong game with microservices architecture and enterprise-grade security.A real-time Pong-style game built by 42-Network students.

**North-star:** _< 30 s from page-load → fair online match._

**Goal:** _< 30s from page-load → fair online match._

## 🏗️ Architecture

---

This project uses **Hexagonal Architecture** (Ports & Adapters) for maintainability and testability.

## 🚀 Quick Start (For Your Teammates!)

```

### Prerequisitessrc/

- **Node.js** v18+ ([Download](https://nodejs.org/))├─ domain/          # Business logic & entities

- **Docker Desktop** ([Download](https://www.docker.com/))├─ application/     # Use cases & workflows

- **pnpm** (will be installed automatically if missing)├─ adapters/        # External interfaces (DB, HTTP, etc.)

├─ config/          # Environment configuration

### One-Command Setup 🎯└─ app.ts           # Dependency injection

```

**Windows:**

```powershell## 🚀 Quick Start

powershell -ExecutionPolicy Bypass -File setup.ps1

``````bash

# Install dependencies

**Linux/Mac/WSL:**pnpm install

```bash

bash setup.sh# Start development server

```pnpm run dev

```

This will:

- ✅ Install all dependencies# Run tests

- ✅ Set up HashiCorp Vault with secretspnpm test

- ✅ Start Redis database

- ✅ Configure environment variables# Lint code

- ✅ Validate everything workspnpm run lint



### Start the Project## 📋 Development



```bash- **Framework**: Fastify (Node.js)

# Windows (recommended - handles PowerShell issues)- **Language**: TypeScript

.\start.bat- **Architecture**: Hexagonal Architecture

- **Database**: SQLite (development)

# Or use pnpm directly (all platforms)- **Testing**: Vitest

pnpm run dev:all- **Linting**: ESLint

```

## 🤝 Contributing

**That's it!** All 5 services will start:

- 🌐 API Gateway: `http://localhost:3000`1. Follow the established Hexagonal Architecture patterns

- 👤 User Service: `http://localhost:3001`2. Write tests for new features

- 🎮 Game Service: `http://localhost:3002`3. Run `pnpm run lint` before committing

- 💬 Chat Service: `http://localhost:3003`4. Use conventional commits

- 🏆 Tournament Service: `http://localhost:3004`

## 📚 Key Files

### Stop Services

- `src/domain/` - Business entities and rules

**Windows:**- `src/application/` - Use cases and workflows

```bash- `src/adapters/` - External interfaces and implementations

.\stop-services.bat- `docs/openapi.yaml` - API documentation

```

**Linux/Mac:**
```bash
pkill -f tsx
```

---

## 🏗️ Architecture

### Microservices Overview

```
┌─────────────────────────────────────────────────────────┐
│                    API Gateway (:3000)                   │
│                 (Rate Limiting, Auth)                    │
└────────┬────────┬──────────┬──────────┬─────────────────┘
         │        │          │          │
    ┌────▼───┐ ┌─▼────┐ ┌───▼───┐ ┌───▼─────────┐
    │  User  │ │ Game │ │ Chat  │ │ Tournament  │
    │:3001   │ │:3002 │ │:3003  │ │   :3004     │
    └────┬───┘ └──┬───┘ └───┬───┘ └──────┬──────┘
         │        │          │            │
    ┌────▼────────▼──────────▼────────────▼─────┐
    │         SQLite + Redis Databases           │
    └────────────────────────────────────────────┘
                        │
              ┌─────────▼──────────┐
              │   HashiCorp Vault  │
              │   (Secrets Store)  │
              │      :8200         │
              └────────────────────┘
```

### Project Structure

```
transcendence/
├── services/
│   ├── user-service/        # Authentication, profiles, 2FA
│   ├── game-service/        # Real-time Pong game logic
│   ├── chat-service/        # WebSocket chat rooms
│   └── tournament-service/  # Tournament brackets, matchmaking
├── infrastructure/
│   ├── api-gateway/         # Request routing, rate limiting
│   ├── vault/               # HashiCorp Vault setup
│   │   ├── scripts/         # Automated setup & validation
│   │   └── policies/        # Access control policies
│   └── nginx-modsecurity/   # WAF (Web Application Firewall)
├── packages/
│   ├── shared-types/        # TypeScript type definitions
│   ├── shared-utils/        # Common utilities + Vault helper
│   └── shared-validation/   # Input validation schemas
└── docs/                    # Documentation
```

---

## 🔐 Security Features

### HashiCorp Vault Integration

**All sensitive data is stored in Vault**, not in environment variables or code:

- 🔑 **JWT signing keys** - For authentication tokens
- 🔐 **OAuth credentials** - Google, GitHub login
- 🗄️ **Database credentials** - Connection strings
- 🎮 **Game configuration** - Server settings
- 💬 **Chat configuration** - Rate limits, moderation
- 📧 **Email service** - SMTP credentials
- 🛠️ **API keys** - External service integrations

**Why Vault?**
- ✅ Centralized secret management
- ✅ Encrypted storage
- ✅ Audit logging (who accessed what)
- ✅ Easy secret rotation
- ✅ Fine-grained access control
- ✅ Never commit secrets to Git

**Learn More:** See [VAULT-QUICK-GUIDE.md](./VAULT-QUICK-GUIDE.md) for a simple 3-minute overview.

### Other Security Measures

- 🛡️ **ModSecurity WAF** - Protection against common attacks
- 🚦 **Rate Limiting** - Prevent abuse and DDoS
- 🔒 **2FA Support** - Two-factor authentication
- 🔑 **JWT Authentication** - Stateless session management
- 📝 **Input Validation** - Schema-based validation
- 🌐 **CORS Protection** - Cross-origin request control

---

## 🧪 Development

### Available Commands

```bash
# Start all services in development mode
pnpm run dev:all

# Start individual services
pnpm run dev:user
pnpm run dev:game
pnpm run dev:chat
pnpm run dev:tournament
pnpm run dev:gateway

# Build for production
pnpm run build

# Run tests
pnpm test

# Lint code
pnpm run lint

# Type checking
pnpm run type-check
```

### Vault Commands

```bash
# Validate Vault integration
bash infrastructure/vault/scripts/validate-integration.sh

# Check Vault health
curl http://localhost:8200/v1/sys/health

# Re-setup secrets (if needed)
bash infrastructure/vault/scripts/setup-secrets-dev.sh

# View all secrets (development only!)
bash infrastructure/vault/scripts/test-vault-system.sh
```

### Docker Commands

```bash
# View running containers
docker ps

# View Vault logs
docker logs vault-dev

# View Redis logs
docker logs redis-dev

# Stop containers
docker stop vault-dev redis-dev

# Restart containers
docker restart vault-dev redis-dev

# Remove containers (will lose data!)
docker rm -f vault-dev redis-dev
```

---

## 📦 Technology Stack

### Backend
- **Node.js** v22+ - Runtime environment
- **TypeScript** - Type-safe JavaScript
- **Fastify** - High-performance web framework
- **Pino** - Fast JSON logger
- **Socket.io** - WebSocket communication

### Databases
- **SQLite** - User and Tournament data
- **Redis** - Game state and Chat messages

### Security & Infrastructure
- **HashiCorp Vault** - Secret management
- **ModSecurity + Nginx** - Web Application Firewall
- **Docker** - Containerization

### Development Tools
- **pnpm** - Fast, disk-efficient package manager
- **ESLint** - Code linting
- **Vitest** - Unit testing
- **tsx** - Fast TypeScript execution

---

## 📚 Documentation

- 📖 **[VAULT-QUICK-GUIDE.md](./VAULT-QUICK-GUIDE.md)** - Simple Vault overview (3 min read)
- 🏗️ **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - Detailed architecture guide
- 🛠️ **[docs/DEVELOPMENT_GUIDE.md](./docs/DEVELOPMENT_GUIDE.md)** - Development best practices
- 🔧 **[docs/VAULT_TESTING_GUIDE.md](./docs/VAULT_TESTING_GUIDE.md)** - Testing Vault integration
- 🌐 **[docs/openapi.yaml](./docs/openapi.yaml)** - API documentation

---

## 🐛 Troubleshooting

### Services won't start - "Port already in use"

**Windows:**
```powershell
.\stop-services.bat
```

**Linux/Mac:**
```bash
pkill -f tsx
# Or find specific processes:
lsof -ti:3000,3001,3002,3003,3004 | xargs kill -9
```

### Vault validation fails

```bash
# Check Vault is running
docker ps | grep vault-dev

# Check Vault health
curl http://localhost:8200/v1/sys/health

# Re-initialize Vault secrets
export VAULT_ADDR=http://localhost:8200
export VAULT_TOKEN=dev-root-token
bash infrastructure/vault/scripts/setup-secrets-dev.sh
```

### PowerShell execution policy error

```powershell
# Use the batch file instead:
.\start.bat

# Or change execution policy (admin required):
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Database errors - "Cannot open database"

```bash
# Create database directories
mkdir -p services/user-service/data
mkdir -p services/tournament-service/data
```

### Docker issues

```bash
# Make sure Docker is running
docker info

# Restart Docker Desktop and try again
```

---

## 🤝 Contributing

### Git Workflow

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd transcendence
   ```

2. **Run setup script**
   ```bash
   # Windows
   powershell -ExecutionPolicy Bypass -File setup.ps1
   
   # Linux/Mac
   bash setup.sh
   ```

3. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

4. **Make your changes and test**
   ```bash
   pnpm run dev:all
   pnpm test
   pnpm run lint
   ```

5. **Commit with conventional commits**
   ```bash
   git commit -m "feat: add new feature"
   git commit -m "fix: resolve bug"
   git commit -m "docs: update README"
   ```

6. **Push and create pull request**
   ```bash
   git push origin feature/your-feature-name
   ```

### Code Standards

- ✅ Use **TypeScript** with strict mode
- ✅ Follow **Hexagonal Architecture** patterns
- ✅ Write **unit tests** for new features
- ✅ Use **Pino logger** for logging
- ✅ Validate inputs with **shared-validation**
- ✅ Never commit **secrets** or **database files**
- ✅ Use **conventional commits** format

---

## 📄 License

This project is part of the 42 School curriculum.

---

## 🎯 Project Goals

- ⚡ **Performance** - < 30s from load to match
- 🔐 **Security** - Enterprise-grade secret management
- 🏗️ **Scalability** - Microservices architecture
- 🧪 **Testability** - Hexagonal architecture
- 📈 **Maintainability** - Clean code principles
- 🤝 **Collaboration** - Clear documentation

---

**Built with ❤️ by the Transcendence Team**

_Questions? Check [VAULT-QUICK-GUIDE.md](./VAULT-QUICK-GUIDE.md) or ask in the team chat!_
