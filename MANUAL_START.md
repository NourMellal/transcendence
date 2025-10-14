# 🚀 Transcendence - Manual Start Guide

## Step-by-Step Terminal Commands

### Prerequisites Check

```bash
# Check Node.js
node --version  # Should be v22+

# Check Docker
docker ps  # Should show vault-dev running

# If Vault not running:
docker start vault-dev
```

---

## Start Services (Manual - 5 Terminals)

### Terminal 1: User Service (Port 3001)

```powershell
cd c:\transcendence\services\user-service
$env:VAULT_ADDR = "http://localhost:8200"
$env:VAULT_TOKEN = "dev-root-token-12345"
pnpm.cmd run dev
```

**Or in WSL/Bash:**
```bash
cd /mnt/c/transcendence/services/user-service
export VAULT_ADDR="http://localhost:8200"
export VAULT_TOKEN="dev-root-token-12345"
npx tsx src/server.ts
```

---

### Terminal 2: Game Service (Port 3002)

```powershell
cd c:\transcendence\services\game-service
$env:VAULT_ADDR = "http://localhost:8200"
$env:VAULT_TOKEN = "dev-root-token-12345"
pnpm.cmd run dev
```

**Or in WSL/Bash:**
```bash
cd /mnt/c/transcendence/services/game-service
export VAULT_ADDR="http://localhost:8200"
export VAULT_TOKEN="dev-root-token-12345"
npx tsx src/server.ts
```

---

### Terminal 3: Chat Service (Port 3003)

```powershell
cd c:\transcendence\services\chat-service
$env:VAULT_ADDR = "http://localhost:8200"
$env:VAULT_TOKEN = "dev-root-token-12345"
pnpm.cmd run dev
```

**Or in WSL/Bash:**
```bash
cd /mnt/c/transcendence/services/chat-service
export VAULT_ADDR="http://localhost:8200"
export VAULT_TOKEN="dev-root-token-12345"
npx tsx src/server.ts
```

---

### Terminal 4: Tournament Service (Port 3004)

```powershell
cd c:\transcendence\services\tournament-service
$env:VAULT_ADDR = "http://localhost:8200"
$env:VAULT_TOKEN = "dev-root-token-12345"
pnpm.cmd run dev
```

**Or in WSL/Bash:**
```bash
cd /mnt/c/transcendence/services/tournament-service
export VAULT_ADDR="http://localhost:8200"
export VAULT_TOKEN="dev-root-token-12345"
npx tsx src/server.ts
```

---

### Terminal 5: API Gateway (Port 3000)

```powershell
cd c:\transcendence\infrastructure\api-gateway
$env:VAULT_ADDR = "http://localhost:8200"
$env:VAULT_TOKEN = "dev-root-token-12345"
pnpm.cmd run dev
```

**Or in WSL/Bash:**
```bash
cd /mnt/c/transcendence/infrastructure/api-gateway
export VAULT_ADDR="http://localhost:8200"
export VAULT_TOKEN="dev-root-token-12345"
npx tsx src/server.ts
```

---

## Verify Services

```bash
# Test each service
curl http://localhost:3001/health  # User Service
curl http://localhost:3002/health  # Game Service
curl http://localhost:3003/health  # Chat Service
curl http://localhost:3004/health  # Tournament Service
curl http://localhost:3000/health  # API Gateway
```

---

## Stop Services

Press `Ctrl+C` in each terminal window.

**Or kill by port (WSL/Bash):**
```bash
# Kill individual service
kill $(lsof -ti:3001)  # User Service
kill $(lsof -ti:3002)  # Game Service
kill $(lsof -ti:3003)  # Chat Service
kill $(lsof -ti:3004)  # Tournament Service
kill $(lsof -ti:3000)  # API Gateway

# Or kill all at once
for port in 3000 3001 3002 3003 3004; do
  kill $(lsof -ti:$port) 2>/dev/null
done
```

**PowerShell:**
```powershell
# Stop by port
$port = 3001
Get-Process -Id (Get-NetTCPConnection -LocalPort $port).OwningProcess | Stop-Process -Force
```

---

## Troubleshooting

### Port Already in Use

**Find what's using the port:**
```bash
# Windows
netstat -ano | findstr :3001

# Linux/WSL
lsof -i :3001
```

**Kill the process:**
```bash
# Windows (get PID from netstat above)
taskkill /PID <PID> /F

# Linux/WSL
kill $(lsof -ti:3001)
```

---

### Vault Connection Error

```bash
# Restart Vault
docker restart vault-dev

# Wait for it to be ready (5 seconds)
sleep 5

# Test Vault
curl http://localhost:8200/v1/sys/health
```

Should return: `{"initialized":true,"sealed":false,...}`

---

### PowerShell Script Execution Disabled

```powershell
# Allow running commands in current session only
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

---

## Project Structure

```
transcendence/
├── services/
│   ├── user-service/       (Port 3001) - Auth & Users
│   ├── game-service/       (Port 3002) - Pong Game
│   ├── chat-service/       (Port 3003) - Chat
│   └── tournament-service/ (Port 3004) - Tournaments
│
├── infrastructure/
│   ├── api-gateway/        (Port 3000) - Main Entry
│   └── vault/              - Secrets Management
│
└── packages/               - Shared Libraries
    ├── shared-types/
    ├── shared-utils/       ← Vault client here
    └── shared-validation/
```

---

## Services Overview

| Service | Port | Purpose | Database |
|---------|------|---------|----------|
| **API Gateway** | 3000 | Routes all requests, CORS, Rate limiting | - |
| **User Service** | 3001 | Authentication, Profiles, 2FA | SQLite |
| **Game Service** | 3002 | Real-time Pong (WebSocket) | Redis DB0 |
| **Chat Service** | 3003 | Real-time Chat (WebSocket) | Redis DB1 |
| **Tournament Service** | 3004 | Tournament Management | SQLite |
| **Vault** | 8200 | Secrets Management | - |

---

## That's It!

You now have the complete Transcendence project running with:
- ✅ 5 microservices
- ✅ Vault integration (100%)
- ✅ Real-time WebSocket (game & chat)
- ✅ Hot reload on code changes
- ✅ Full TypeScript support

**Happy coding! 🎉**
