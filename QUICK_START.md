# 🚀 Transcendence - Quick Start Guide

## ⚡ START ALL SERVICES AT ONCE

###  **Option 1: Using Scripts (Recommended)**

```powershell
# 1. Start all services at once
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\start-all.ps1

# 2. Stop all services
.\stop-all.ps1
```

**What it does:**
- ✅ Loads all variables from `.env` file automatically
- ✅ Starts all 5 services in background
- ✅ Shows PIDs and log locations
- ✅ Services keep running even if you close the terminal

---

### Option 2: Using Docker Compose

```bash
docker-compose up --build
```

---

## 📁 Environment Variables (.env file)

All environment variables are in the `.env` file:

```bash
# Vault Configuration
VAULT_ADDR=http://localhost:8200
VAULT_TOKEN=dev-root-token-12345

# Service Ports
USER_SERVICE_PORT=3001
GAME_SERVICE_PORT=3002
CHAT_SERVICE_PORT=3003
TOURNAMENT_SERVICE_PORT=3004
API_GATEWAY_PORT=3000

# ... and more
```

**You don't need to set them manually!** The `start-all.ps1` script loads them automatically.

---

## ✅ Verify Services

```powershell
# Check if services are running
Get-Process | Where-Object {$_.ProcessName -like "*node*"}

# Test endpoints
curl http://localhost:3001/health  # User Service
curl http://localhost:3002/health  # Game Service
curl http://localhost:3003/health  # Chat Service
curl http://localhost:3004/health  # Tournament Service
curl http://localhost:3000/health  # API Gateway
```

---

## 📋 View Logs

```powershell
# View logs in real-time
Get-Content logs\user-service.log -Wait

# View all logs
Get-Content logs\*.log

# Check errors
Get-Content logs\user-service.log.error
```

---

## 🛑 Stop Services

```powershell
.\stop-all.ps1
```

Or manually:
```powershell
# Kill by port
Get-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess | Stop-Process
```

---

## 📦 Project Structure

```
transcendence/
├── .env                        ← Environment variables HERE!
├── start-all.ps1              ← Start everything at once
├── stop-all.ps1               ← Stop everything
│
├── services/                  ← 4 Microservices
│   ├── user-service/         (Port 3001)
│   ├── game-service/         (Port 3002)
│   ├── chat-service/         (Port 3003)
│   └── tournament-service/   (Port 3004)
│
├── infrastructure/
│   ├── api-gateway/          (Port 3000)
│   └── vault/                ← Secrets management
│
├── packages/                 ← Shared code
│   ├── shared-types/
│   ├── shared-utils/         ← Vault client
│   └── shared-validation/
│
└── logs/                     ← Service logs & PIDs
```

---

## 🎯 What You Get

- **5 Services Running:** User, Game, Chat, Tournament, API Gateway
- **Vault Integration:** 100% - All secrets secured
- **Hot Reload:** Changes auto-reload with `tsx`
- **WebSocket:** Real-time game & chat
- **TypeScript:** Full type safety

---

## 🐛 Troubleshooting

### "Vault is not running"
```bash
docker start vault-dev
```

### "Port already in use"
```powershell
# Find what's using the port
Get-NetTCPConnection -LocalPort 3001

# Kill it
.\stop-all.ps1
```

### "Can't load .env"
Make sure `.env` file exists in the root directory.

---

## 🎉 You're Done!

Run `.\start-all.ps1` and all services start with environment variables from `.env`.

**No need to set variables manually every time!**
