#!/bin/bash
# =======================================================================
# SIMPLIFIED Vault Secret Setup for PFE/Demo
# =======================================================================
# This is a simplified version for educational purposes
# Only includes essential secrets needed for the demo
# =======================================================================

set -euo pipefail

VAULT_ADDR="${VAULT_ADDR:-http://localhost:8200}"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[VAULT-SETUP]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

# Ensure we have a token
if [ -z "${VAULT_TOKEN:-}" ]; then
    echo "Error: VAULT_TOKEN environment variable is required"
    exit 1
fi

log_warn "Setting up SIMPLIFIED secrets for PFE demo..."
echo

# =======================================================================
# 1. DATABASE SECRETS (Essential)
# =======================================================================
log_info "📦 Setting up database configuration..."

# User Service - SQLite
curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/secret/data/database/user-service" \
    -d '{
        "data": {
            "type": "sqlite",
            "host": "./user-service.db",
            "database": "users"
        }
    }' > /dev/null

# Game Service - Redis
curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/secret/data/database/game-service" \
    -d '{
        "data": {
            "host": "localhost",
            "port": "6379",
            "password": "",
            "db": "0"
        }
    }' > /dev/null

# Chat Service - Redis
curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/secret/data/database/chat-service" \
    -d '{
        "data": {
            "host": "localhost",
            "port": "6379",
            "password": "",
            "db": "1"
        }
    }' > /dev/null

# Tournament Service - SQLite
curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/secret/data/database/tournament-service" \
    -d '{
        "data": {
            "type": "sqlite",
            "host": "./tournament-service.db",
            "database": "tournaments"
        }
    }' > /dev/null

log_success "Database secrets configured"

# =======================================================================
# 2. JWT SECRETS (Essential for Authentication)
# =======================================================================
log_info "🔐 Setting up JWT authentication..."

curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/secret/data/jwt/auth" \
    -d '{
        "data": {
            "secret_key": "demo-jwt-secret-key-for-pfe-project-2024",
            "issuer": "transcendence-pfe",
            "expiration_hours": "24"
        }
    }' > /dev/null

curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/secret/data/jwt/game" \
    -d '{
        "data": {
            "secret_key": "demo-game-jwt-for-websocket-auth",
            "issuer": "transcendence-game",
            "expiration_minutes": "60"
        }
    }' > /dev/null

log_success "JWT secrets configured"

# =======================================================================
# 3. GAME CONFIGURATION (Essential for game logic)
# =======================================================================
log_info "🎮 Setting up game configuration..."

curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/secret/data/game/config" \
    -d '{
        "data": {
            "websocket_secret": "demo-websocket-secret",
            "match_timeout_minutes": "30",
            "max_players": "4"
        }
    }' > /dev/null

log_success "Game configuration set"

# =======================================================================
# 4. CHAT CONFIGURATION (Essential for chat)
# =======================================================================
log_info "💬 Setting up chat configuration..."

curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/secret/data/chat/config" \
    -d '{
        "data": {
            "websocket_secret": "demo-chat-websocket",
            "message_retention_days": "7",
            "max_message_length": "500"
        }
    }' > /dev/null

log_success "Chat configuration set"

# =======================================================================
# 5. API GATEWAY (Rate limiting and CORS)
# =======================================================================
log_info "🌐 Setting up API Gateway..."

curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/secret/data/gateway/config" \
    -d '{
        "data": {
            "rate_limit_per_minute": "100",
            "cors_origins": "http://localhost:3000,http://localhost:8080"
        }
    }' > /dev/null

log_success "API Gateway configured"

# =======================================================================
# 6. SECURITY BASICS (Session & encryption)
# =======================================================================
log_info "🔒 Setting up security configuration..."

curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/secret/data/security/config" \
    -d '{
        "data": {
            "session_secret": "demo-session-secret-key",
            "password_salt": "demo-salt-for-passwords"
        }
    }' > /dev/null

log_success "Security configuration set"

echo
log_success "============================================"
log_success "  ✅ Vault Setup Complete!"
log_success "============================================"
echo
echo "📋 Summary of Configured Secrets:"
echo "   ✅ Database configs (SQLite for users/tournaments, Redis for game/chat)"
echo "   ✅ JWT tokens (for authentication)"
echo "   ✅ Game settings (WebSocket, timeouts)"
echo "   ✅ Chat settings (message limits)"
echo "   ✅ API Gateway (rate limits, CORS)"
echo "   ✅ Security basics (sessions, passwords)"
echo
echo "🔗 Vault Secret Paths:"
echo "   • secret/database/*        (Database connections)"
echo "   • secret/jwt/*             (Authentication tokens)"
echo "   • secret/game/config       (Game settings)"
echo "   • secret/chat/config       (Chat settings)"
echo "   • secret/gateway/config    (API Gateway)"
echo "   • secret/security/config   (Security basics)"
echo
echo "💡 PFE Notes:"
echo "   • All secrets are demo values (NOT for production!)"
echo "   • No external APIs needed (OAuth, Email, etc.)"
echo "   • Simple SQLite + Redis setup"
echo "   • Perfect for local demo/presentation"
echo
