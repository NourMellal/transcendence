#!/bin/bash
# =======================================================================
# Development Environment Secret Setup for Vault
# =======================================================================
# This script sets up development-specific secrets and configurations
# for the Transcendence project
#
# Usage: Called by init-vault.sh or run standalone with VAULT_TOKEN set
# =======================================================================

set -euo pipefail

VAULT_ADDR="${VAULT_ADDR:-http://localhost:8200}"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[DEV-SETUP]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[DEV-SUCCESS]${NC} $1"
}

# Ensure we have a token
if [ -z "${VAULT_TOKEN:-}" ]; then
    echo "Error: VAULT_TOKEN environment variable is required"
    exit 1
fi

log_info "Setting up development secrets..."

# 1. Database Configuration (Development SQLite + Test Postgres)
log_info "Setting up database secrets..."

curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/secret/data/database/user-service" \
    -d '{
        "data": {
            "type": "sqlite",
            "host": "./services/user-service/user-service.db",
            "database_url": "file:./services/user-service/user-service.db",
            "connection_pool_size": "5",
            "migration_run": "true"
        }
    }' > /dev/null

# Game Service Database (Redis for game state)
curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/secret/data/database/game-service" \
    -d '{
        "data": {
            "host": "localhost",
            "port": "6379",
            "password": "",
            "db": "0",
            "connection_pool_size": "10"
        }
    }' > /dev/null

# Chat Service Database (Redis for chat messages and presence)
curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/secret/data/database/chat-service" \
    -d '{
        "data": {
            "host": "localhost",
            "port": "6379",
            "password": "",
            "db": "1",
            "connection_pool_size": "10"
        }
    }' > /dev/null

# Tournament Service Database (SQLite for tournament data)
curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/secret/data/database/tournament-service" \
    -d '{
        "data": {
            "type": "sqlite",
            "host": "./services/tournament-service/tournament-service.db",
            "database_url": "file:./services/tournament-service/tournament-service.db",
            "connection_pool_size": "5",
            "migration_run": "true"
        }
    }' > /dev/null

# 2. JWT Secrets (Development keys)
log_info "Setting up JWT secrets..."

curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/secret/data/jwt/auth" \
    -d '{
        "data": {
            "secret_key": "dev-jwt-secret-key-very-long-and-secure-for-development-only",
            "issuer": "transcendence-dev",
            "expiration_hours": "24",
            "refresh_expiration_hours": "168"
        }
    }' > /dev/null

curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/secret/data/jwt/game" \
    -d '{
        "data": {
            "secret_key": "dev-game-jwt-secret-for-websocket-auth-development",
            "issuer": "transcendence-game-dev",
            "expiration_minutes": "60"
        }
    }' > /dev/null

# 3. API Keys and External Services (Development/Mock)
log_info "Setting up API keys and external service secrets..."

curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/secret/data/api/oauth" \
    -d '{
        "data": {
            "google_client_id": "dev-google-client-id",
            "google_client_secret": "dev-google-client-secret",
            "github_client_id": "dev-github-client-id",
            "github_client_secret": "dev-github-client-secret",
            "42_client_id": "dev-42-client-id",
            "42_client_secret": "dev-42-client-secret"
        }
    }' > /dev/null

curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/secret/data/api/email" \
    -d '{
        "data": {
            "smtp_host": "localhost",
            "smtp_port": "1025",
            "smtp_user": "dev",
            "smtp_password": "dev",
            "from_email": "noreply@transcendence.dev",
            "from_name": "Transcendence Dev"
        }
    }' > /dev/null

# 4. Game Configuration
log_info "Setting up game secrets..."

curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/secret/data/game/config" \
    -d '{
        "data": {
            "websocket_secret": "dev-websocket-secret-key-123",
            "match_timeout_minutes": "30",
            "tournament_secret": "dev-tournament-secret-456",
            "leaderboard_cache_ttl": "300"
        }
    }' > /dev/null

# 5. Chat Service Configuration
log_info "Setting up chat secrets..."

curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/secret/data/chat/config" \
    -d '{
        "data": {
            "encryption_key": "dev-chat-encryption-key-32-chars",
            "websocket_secret": "dev-chat-websocket-secret",
            "message_retention_days": "30",
            "file_upload_max_size": "10485760"
        }
    }' > /dev/null

# 6. API Gateway Configuration
log_info "Setting up API gateway secrets..."

curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/secret/data/gateway/config" \
    -d '{
        "data": {
            "rate_limit_secret": "dev-rate-limit-secret",
            "cors_origins": "http://localhost:3000,http://localhost:8080",
            "api_key_salt": "dev-api-key-salt-for-hashing",
            "internal_api_key": "dev-internal-api-key-123"
        }
    }' > /dev/null

# 7. Monitoring and Logging
log_info "Setting up monitoring secrets..."

curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/secret/data/monitoring/config" \
    -d '{
        "data": {
            "metrics_secret": "dev-metrics-secret",
            "log_level": "debug",
            "tracing_endpoint": "http://jaeger:14268/api/traces",
            "prometheus_endpoint": "http://prometheus:9090"
        }
    }' > /dev/null

# 8. Security Configuration (Development-specific)
log_info "Setting up security configuration..."

curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/secret/data/security/config" \
    -d '{
        "data": {
            "session_secret": "dev-session-secret-key-very-long",
            "csrf_secret": "dev-csrf-secret-key",
            "encryption_salt": "dev-encryption-salt-for-passwords",
            "2fa_issuer": "Transcendence Dev",
            "password_reset_ttl": "3600"
        }
    }' > /dev/null

# 9. Storage Configuration
log_info "Setting up storage secrets..."

curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/secret/data/storage/config" \
    -d '{
        "data": {
            "type": "local",
            "local_path": "/tmp/transcendence-uploads",
            "max_file_size": "5242880",
            "allowed_types": "image/jpeg,image/png,image/gif",
            "s3_bucket": "transcendence-dev",
            "s3_region": "us-east-1"
        }
    }' > /dev/null

# 10. Development Tools Configuration
log_info "Setting up development tools configuration..."

curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/secret/data/tools/config" \
    -d '{
        "data": {
            "debug_mode": "true",
            "hot_reload": "true",
            "profiling_enabled": "true",
            "test_data_seed": "true",
            "mock_external_apis": "true"
        }
    }' > /dev/null

log_success "Development secrets setup completed!"

echo
echo "📋 Development Secrets Summary:"
echo "   ✅ Database configuration (User: SQLite, Game: Redis, Chat: Redis, Tournament: SQLite)"
echo "   ✅ JWT authentication keys"
echo "   ✅ OAuth provider credentials (dev/mock)"
echo "   ✅ Email service configuration (local SMTP)"
echo "   ✅ Game service configuration"
echo "   ✅ Chat service configuration"
echo "   ✅ API Gateway configuration"
echo "   ✅ Monitoring and logging setup"
echo "   ✅ Security configuration"
echo "   ✅ Storage configuration (local)"
echo "   ✅ Development tools configuration"
echo
echo "🔗 Secret Paths:"
echo "   • secret/database/*"
echo "   • secret/jwt/*"
echo "   • secret/api/*"
echo "   • secret/game/*"
echo "   • secret/chat/*"
echo "   • secret/gateway/*"
echo "   • secret/monitoring/*"
echo "   • secret/security/*"
echo "   • secret/storage/*"
echo "   • secret/tools/*"
echo
echo "💡 Development Notes:"
echo "   • All secrets are development-safe values"
echo "   • External APIs are set to mock/development endpoints"
echo "   • Debug mode and hot reload are enabled"
echo "   • Database uses SQLite for user and tournament services"
echo "   • Database uses Redis for game and chat services"
echo "   • Email uses local SMTP server (MailHog/similar)"