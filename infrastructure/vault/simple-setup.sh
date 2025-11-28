#!/bin/bash
#
# Simple Vault bootstrapper for local development
# ------------------------------------------------
# * Starts with dev token (override with VAULT_TOKEN)
# * Generates a single INTERNAL_API_KEY and reuses it everywhere
# * Seeds deterministic secrets so every service can start immediately
#

set -euo pipefail
IFS=$'\n\t'

VAULT_ADDR="${VAULT_ADDR:-http://localhost:8200}"
VAULT_TOKEN="${VAULT_TOKEN:-dev-root-token}"
SHARED_INTERNAL_KEY_PATH="secret/data/shared/internal-api-key"

log() {
    local level="$1"; shift
    printf '[%s] %s\n' "$level" "$*"
}

ensure_command() {
    if ! command -v "$1" >/dev/null 2>&1; then
        log "ERR" "Missing required command: $1"
        exit 1
    fi
}

vault_put() {
    local path="$1"
    local payload="$2"
    log "INF" "Writing to ${path}"
    curl -sSf -X POST \
        -H "Content-Type: application/json" \
        -H "X-Vault-Token: ${VAULT_TOKEN}" \
        "${VAULT_ADDR}/v1/${path}" \
        -d "${payload}" >/dev/null \
    || { 
        log "ERR" "Failed to write ${path}"
        echo "Payload was:"
        echo "${payload}"
        exit 1
    }
}

ensure_command curl
ensure_command openssl
ensure_command python3

log "INF" "Using Vault @ ${VAULT_ADDR}"
if ! curl -sSf "${VAULT_ADDR}/v1/sys/health" >/dev/null; then
    log "ERR" "Vault is not reachable. Start it first (e.g. docker compose up -d vault)."
    exit 1
fi

if [[ -z "${INTERNAL_API_KEY:-}" ]]; then
    INTERNAL_API_KEY="$(openssl rand -hex 32)"
    GENERATED_INTERNAL_API_KEY=1
else
    GENERATED_INTERNAL_API_KEY=0
fi

JWT_SECRET="${JWT_SECRET:-my-super-secret-jwt-key-for-signing-tokens}"
CURRENT_TIME="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

log "INF" "Seeding shared secrets..."

vault_put "${SHARED_INTERNAL_KEY_PATH}" "$(cat <<EOF
{
  "data": {
    "key": "${INTERNAL_API_KEY}",
    "source": "simple-setup",
    "generated_at": "${CURRENT_TIME}"
  }
}
EOF
)"

vault_put "secret/data/jwt/auth" "$(cat <<EOF
{
  "data": {
    "secret_key": "${JWT_SECRET}",
    "issuer": "transcendence",
    "expiration_hours": "24"
  }
}
EOF
)"

vault_put "secret/data/security/config" "$(cat <<EOF
{
  "data": {
    "internal_api_key": "${INTERNAL_API_KEY}"
  }
}
EOF
)"

# IMPORTANT: fixed JSON here (cors_origins as array, proper commas)
vault_put "secret/data/gateway/config" "$(cat <<EOF
{
  "data": {
    "cors_origins": [
      "http://localhost:3003",
      "http://localhost:8080",
      "http://localhost:3001"
    ],
    "internalApiKey": "${INTERNAL_API_KEY}",
    "rateLimitMax": "50",
    "rateLimitWindow": "1 minute",
    "debug_marker": "${CURRENT_TIME}"
  }
}
EOF
)"

vault_put "secret/data/api/oauth" "$(cat <<'EOF'
{
  "data": {
    "42_client_id": "YOUR_42_CLIENT_ID_HERE",
    "42_client_secret": "YOUR_42_CLIENT_SECRET_HERE",
    "42_callback_url": "http://localhost:3000/auth/42/callback"
  }
}
EOF
)"

log "INF" "Seeding database configs..."

vault_put "secret/data/database/user-service" "$(cat <<'EOF'
{
  "data": {
    "type": "sqlite",
    "host": "./user-service.db"
  }
}
EOF
)"

vault_put "secret/data/database/game-service" "$(cat <<'EOF'
{
  "data": {
    "host": "localhost",
    "port": "6379"
  }
}
EOF
)"

vault_put "secret/data/database/chat-service" "$(cat <<'EOF'
{
  "data": {
    "host": "localhost",
    "port": "6379"
  }
}
EOF
)"

vault_put "secret/data/database/tournament-service" "$(cat <<'EOF'
{
  "data": {
    "type": "sqlite",
    "host": "./tournament-service.db"
  }
}
EOF
)"

log "INF" "Seeding service configs..."

vault_put "secret/data/game/config" "$(cat <<'EOF'
{
  "data": {
    "websocket_secret": "game-websocket-secret-key",
    "match_timeout_minutes": "30"
  }
}
EOF
)"

vault_put "secret/data/chat/config" "$(cat <<'EOF'
{
  "data": {
    "websocket_secret": "chat-websocket-secret-key",
    "message_retention_days": "30"
  }
}
EOF
)"

log "INF" "Applying API Gateway ACL policy..."

curl -sSf -X PUT \
  -H "Content-Type: application/json" \
  -H "X-Vault-Token: ${VAULT_TOKEN}" \
  "${VAULT_ADDR}/v1/sys/policies/acl/api-gateway" \
  -d "$(cat <<'EOF'
{
  "policy": "# Allow API Gateway to read JWT\npath \"secret/data/jwt/auth\" {\n  capabilities = [\"read\"]\n}\n\n# Allow API Gateway to read OAuth 42 credentials\npath \"secret/data/api/oauth\" {\n  capabilities = [\"read\"]\n}\n\n# Allow API Gateway to read shared internal key\npath \"secret/data/shared/internal-api-key\" {\n  capabilities = [\"read\"]\n}\n\n# Allow API Gateway to read its own config\npath \"secret/data/gateway/config\" {\n  capabilities = [\"read\"]\n}\n"
}
EOF
)" >/dev/null

log "INF" "Creating scoped token for API Gateway..."
GATEWAY_TOKEN="$(curl -sSf -X POST \
  -H "Content-Type: application/json" \
  -H "X-Vault-Token: ${VAULT_TOKEN}" \
  "${VAULT_ADDR}/v1/auth/token/create" \
  -d '{"policies":["api-gateway"],"ttl":"720h","renewable":true,"display_name":"api-gateway-token"}' | \
  python3 -c "import json,sys; data=json.load(sys.stdin); print(data.get('auth', {}).get('client_token',''))")"

if [[ -n "${GATEWAY_TOKEN}" ]]; then
    echo "${GATEWAY_TOKEN}" > /tmp/vault-gateway-token.txt
    log "INF" "Gateway token stored at /tmp/vault-gateway-token.txt"
else
    log "WRN" "Failed to capture Gateway token."
fi

echo "${INTERNAL_API_KEY}" > /tmp/internal-api-key.txt
log "INF" "Internal API key stored at /tmp/internal-api-key.txt"

if [[ "${GENERATED_INTERNAL_API_KEY}" -eq 1 ]]; then
    log "INF" "Export INTERNAL_API_KEY=${INTERNAL_API_KEY} before rerunning to reuse this value."
fi

log "INF" "Vault bootstrap complete ✅"
