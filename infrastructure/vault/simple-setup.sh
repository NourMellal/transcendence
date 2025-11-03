#!/bin/bash
# =======================================================================
# Development Environment Secret Setup for Vault
# =======================================================================
# This script sets up development-specific secrets and configurations
# for the Transcendence project
#
# Usage: Called by init-vault.sh or run standalone with VAULT_TOKEN set
# =======================================================================


set -e

VAULT_ADDR="${VAULT_ADDR:-http://localhost:8200}"
VAULT_TOKEN="${VAULT_TOKEN:-dev-root-token}"

# Generate or reuse the internal API key so every service shares the same value
if [ -z "${INTERNAL_API_KEY:-}" ]; then
    if command -v openssl >/dev/null 2>&1; then
        INTERNAL_API_KEY="$(openssl rand -hex 32)"
    else
        INTERNAL_API_KEY="$(head -c 32 /dev/urandom | xxd -p | head -c 64)"
    fi
    GENERATED_INTERNAL_API_KEY=1
else
    GENERATED_INTERNAL_API_KEY=0
fi

echo "🔐 Starting Simple Vault Setup for PFE..."
echo ""

# Check if Vault is running
if ! curl -s "$VAULT_ADDR/v1/sys/health" > /dev/null 2>&1; then
    echo "❌ Vault is not running!"
    echo "   Start it with: docker-compose up -d"
    exit 1
fi

echo "✅ Vault is running at $VAULT_ADDR"
echo ""

# =================================================================
# STEP 1: Store JWT Secret (for authentication)
# =================================================================
echo "📝 Storing JWT secrets..."
curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/secret/data/jwt/auth" \
    -d '{
        "data": {
            "secret_key": "my-super-secret-jwt-key-for-signing-tokens",
            "issuer": "transcendence",
            "expiration_hours": "24"
        }
    }' > /dev/null

# =================================================================
# STEP 2: Store Database Configurations
# =================================================================
echo "📝 Storing database configurations..."

# User Service Database (SQLite)
curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/secret/data/database/user-service" \
    -d '{
        "data": {
            "type": "sqlite",
            "host": "./user-service.db"
        }
    }' > /dev/null

# Game Service Database (Redis)
curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/secret/data/database/game-service" \
    -d '{
        "data": {
            "host": "localhost",
            "port": "6379"
        }
    }' > /dev/null

# Chat Service Database (Redis)
curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/secret/data/database/chat-service" \
    -d '{
        "data": {
            "host": "localhost",
            "port": "6379"
        }
    }' > /dev/null

# Tournament Service Database (SQLite)
curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/secret/data/database/tournament-service" \
    -d '{
        "data": {
            "type": "sqlite",
            "host": "./tournament-service.db"
        }
    }' > /dev/null

# =================================================================
# STEP 3: Store Game Configuration
# =================================================================
echo "📝 Storing game configuration..."
curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/secret/data/game/config" \
    -d '{
        "data": {
            "websocket_secret": "game-websocket-secret-key",
            "match_timeout_minutes": "30"
        }
    }' > /dev/null

# =================================================================
# STEP 4: Store Chat Configuration
# =================================================================
echo "📝 Storing chat configuration..."
curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/secret/data/chat/config" \
    -d '{
        "data": {
            "websocket_secret": "chat-websocket-secret-key",
            "message_retention_days": "30"
        }
    }' > /dev/null

# =================================================================
# STEP 5: Store OAuth 42 Configuration (MANDATORY for PFE)
# =================================================================
echo "📝 Storing OAuth 42 configuration..."
curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/secret/data/api/oauth" \
    -d '{
        "data": {
            "42_client_id": "YOUR_42_CLIENT_ID_HERE",
            "42_client_secret": "YOUR_42_CLIENT_SECRET_HERE",
            "42_callback_url": "http://localhost:3000/auth/42/callback"
        }
    }' > /dev/null

# =================================================================
# STEP 6: Store API Gateway Configuration
# =================================================================
echo "📝 Storing API gateway configuration..."
curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/secret/data/gateway/config" \
    -d "{
        \"data\": {
            \"cors_origins\": \"http://localhost:3000,http://localhost:8080\",
            \"internal_api_key\": \"${INTERNAL_API_KEY}\"
        }
    }" > /dev/null

# =================================================================
# STEP 7: Store shared security configuration
# =================================================================
echo "📝 Storing shared security configuration..."
curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/secret/data/security/config" \
    -d "{
        \"data\": {
            \"internal_api_key\": \"${INTERNAL_API_KEY}\"
        }
    }" > /dev/null

# =================================================================
# STEP 8: Apply API Gateway Policy (REQUIRED)
# =================================================================
echo "🔐 Applying API Gateway security policy..."

# Write the policy to Vault
curl -s -X PUT -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/sys/policies/acl/api-gateway" \
    -d '{
        "policy": "# Allow API Gateway to read JWT secrets\npath \"secret/data/jwt/auth\" {\n  capabilities = [\"read\"]\n}\n\n# Allow API Gateway to read OAuth 42 credentials (MANDATORY for PFE)\npath \"secret/data/api/oauth\" {\n  capabilities = [\"read\"]\n}\n\n# Allow API Gateway to read its own config\npath \"secret/data/gateway/config\" {\n  capabilities = [\"read\"]\n}\n\n# Deny access to other services secrets\npath \"secret/data/database/*\" {\n  capabilities = [\"deny\"]\n}\n\npath \"secret/data/game/*\" {\n  capabilities = [\"deny\"]\n}\n\npath \"secret/data/chat/*\" {\n  capabilities = [\"deny\"]\n}"
    }' > /dev/null

# Create a token for the API Gateway with the restricted policy
echo "🎫 Creating API Gateway token..."
GATEWAY_TOKEN=$(curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/auth/token/create" \
    -d '{
        "policies": ["api-gateway"],
        "ttl": "720h",
        "renewable": true,
        "display_name": "api-gateway-token"
    }' | grep -o '"client_token":"[^"]*"' | cut -d'"' -f4)

# Store the gateway token for easy access
echo "$GATEWAY_TOKEN" > /tmp/vault-gateway-token.txt

echo ""
echo "✅ Vault setup complete!"
echo ""
echo "📊 Summary of Secrets Stored:"
echo "   • JWT authentication keys"
echo "   • OAuth 42 credentials (for 42 School login)"
echo "   • Database configurations (SQLite + Redis)"
echo "   • Game service settings"
echo "   • Chat service settings"
echo "   • API Gateway settings"
echo "   • Shared security settings (Internal API key)"
echo ""
echo "🔐 Security Policy Applied:"
echo "   • API Gateway policy enforced (least privilege access)"
echo "   • Restricted token created and saved to: /tmp/vault-gateway-token.txt"
echo ""
echo "🎫 API Gateway Token: $GATEWAY_TOKEN"
echo ""
echo "⚠️  IMPORTANT: Update your .env file with this token:"
echo "   VAULT_TOKEN=$GATEWAY_TOKEN"
echo ""
echo "$INTERNAL_API_KEY" > /tmp/internal-api-key.txt
echo "🔑 Internal API Key: $INTERNAL_API_KEY"
echo "   • Saved to: /tmp/internal-api-key.txt"
echo ""
if [ "$GENERATED_INTERNAL_API_KEY" -eq 1 ]; then
    echo "💡 Tip: export INTERNAL_API_KEY=\"$INTERNAL_API_KEY\" before rerunning to reuse this value."
    echo ""
fi
echo "⚠️  IMPORTANT: Update OAuth 42 Credentials!"
echo "   1. Get your credentials from: https://profile.intra.42.fr/oauth/applications"
echo "   2. Update them in Vault:"
echo ""
echo "   curl -X POST -H \"X-Vault-Token: dev-root-token\" \\"
echo "     http://localhost:8200/v1/secret/data/api/oauth \\"
echo "     -d '{\"data\": {\"42_client_id\": \"YOUR_ID\", \"42_client_secret\": \"YOUR_SECRET\", \"42_callback_url\": \"http://localhost:3000/auth/42/callback\"}}'"
echo ""
echo "   • Chat service settings"
echo "   • API Gateway settings"
echo ""
echo "🔍 To view secrets:"
echo "   curl -H \"X-Vault-Token: dev-root-token\" http://localhost:8200/v1/secret/data/jwt/auth"
echo ""
echo "🚀 Start services with: pnpm run dev:all"
