# Game Service Security Policy
# ============================
# Defines access for real-time game logic and gameplay management

# Database Access
# ===============
path "secret/data/game-service/database/*" {
  capabilities = ["read"]
}

path "secret/metadata/game-service/database/*" {
  capabilities = ["list"]
}

# Authentication (JWT verification only)
# ======================================
path "secret/data/shared/auth/jwt" {
  capabilities = ["read"]
}

# Real-time Communication
# =======================
# WebSocket secrets for real-time gameplay
path "secret/data/game-service/websocket/*" {
  capabilities = ["read"]
}

# Redis credentials for game state caching
path "secret/data/game-service/redis/*" {
  capabilities = ["read"]
}

# Game Engine Integration
# =======================
# Physics engine API keys
path "secret/data/game-service/physics-engine/*" {
  capabilities = ["read"]
}

# Game analytics and metrics
path "secret/data/game-service/analytics/*" {
  capabilities = ["read"]
}

# Anti-cheat service credentials
path "secret/data/game-service/anti-cheat/*" {
  capabilities = ["read"]
}

# Matchmaking Service
# ==================
# Matchmaking algorithm secrets
path "secret/data/game-service/matchmaking/*" {
  capabilities = ["read"]
}

# Game Session Management
# =======================
# Session encryption for game state
path "secret/data/game-service/session-encryption" {
  capabilities = ["read"]
}

# Leaderboard and Statistics
# ==========================
# Database connections for stats
path "secret/data/game-service/stats-db/*" {
  capabilities = ["read"]
}

# Shared Services
# ===============
# Rate limiting for game API calls
path "secret/data/shared/rate-limiting" {
  capabilities = ["read"]
}

# User data encryption (for game preferences)
path "secret/data/shared/encryption/user-data" {
  capabilities = ["read"]
}

# Metadata Access
# ===============
path "secret/metadata/game-service/*" {
  capabilities = ["list"]
}

path "secret/metadata/shared/auth/jwt" {
  capabilities = ["list"]
}

# Token Management
# ================
path "auth/token/lookup-self" {
  capabilities = ["read"]
}

path "auth/token/renew-self" {
  capabilities = ["update"]
}