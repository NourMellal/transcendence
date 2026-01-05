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
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SEED_FILE="${SEED_FILE:-${SCRIPT_DIR}/.seed.env}"

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

if [[ -f "${SEED_FILE}" ]]; then
    set -a
    # shellcheck disable=SC1090
    . "${SEED_FILE}"
    set +a
    log "INF" "Loaded seed env from ${SEED_FILE}"
fi

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

vault_read_field() {
    local path="$1"
    local field="$2"
    local response
    local body
    local code

    response="$(curl -sS -w "\n%{http_code}" \
        -H "X-Vault-Token: ${VAULT_TOKEN}" \
        "${VAULT_ADDR}/v1/${path}")" || return 1
    code="${response##*$'\n'}"
    body="${response%$'\n'*}"
    if [[ "${code}" != "200" ]]; then
        return 1
    fi

    printf '%s' "${body}" | python3 - <<PY 2>/dev/null || true
import json,sys
try:
    data=json.loads(sys.stdin.read())
    print(data.get("data", {}).get("data", {}).get("${field}", ""))
except Exception:
    pass
PY
}

ensure_command curl
ensure_command openssl
ensure_command python3

log "INF" "Using Vault @ ${VAULT_ADDR}"
if ! curl -sSf "${VAULT_ADDR}/v1/sys/health" >/dev/null; then
    log "ERR" "Vault is not reachable. Start it first (e.g. docker compose up -d vault)."
    exit 1
fi

EXISTING_INTERNAL_API_KEY="$(vault_read_field "${SHARED_INTERNAL_KEY_PATH}" "key" || true)"
if [[ -n "${INTERNAL_API_KEY:-}" ]]; then
    INTERNAL_API_KEY_VALUE="${INTERNAL_API_KEY}"
    WRITE_INTERNAL_API_KEY=1
elif [[ -n "${EXISTING_INTERNAL_API_KEY}" ]]; then
    INTERNAL_API_KEY_VALUE="${EXISTING_INTERNAL_API_KEY}"
    WRITE_INTERNAL_API_KEY=0
else
    INTERNAL_API_KEY_VALUE="$(openssl rand -hex 32)"
    WRITE_INTERNAL_API_KEY=1
fi

EXISTING_JWT_SECRET="$(vault_read_field "secret/data/jwt/auth" "secret_key" || true)"
if [[ -n "${JWT_SECRET:-}" ]]; then
    JWT_SECRET_VALUE="${JWT_SECRET}"
    WRITE_JWT_SECRET=1
elif [[ -n "${EXISTING_JWT_SECRET}" ]]; then
    JWT_SECRET_VALUE="${EXISTING_JWT_SECRET}"
    WRITE_JWT_SECRET=0
else
    JWT_SECRET_VALUE="$(openssl rand -hex 32)"
    WRITE_JWT_SECRET=1
fi

CURRENT_TIME="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
OAUTH_42_CLIENT_ID="${OAUTH_42_CLIENT_ID:-}"
OAUTH_42_CLIENT_SECRET="${OAUTH_42_CLIENT_SECRET:-}"
OAUTH_42_REDIRECT_URI="${OAUTH_42_REDIRECT_URI:-https://localhost/api/auth/42/callback}"
OAUTH_42_AUTHORIZE_URL="${OAUTH_42_AUTHORIZE_URL:-https://api.intra.42.fr/oauth/authorize}"
OAUTH_42_TOKEN_URL="${OAUTH_42_TOKEN_URL:-https://api.intra.42.fr/oauth/token}"
OAUTH_42_PROFILE_URL="${OAUTH_42_PROFILE_URL:-https://api.intra.42.fr/v2/me}"
OAUTH_42_SCOPE="${OAUTH_42_SCOPE:-public}"

log "INF" "Seeding shared secrets..."

if [[ "${WRITE_INTERNAL_API_KEY}" -eq 1 ]]; then
    vault_put "${SHARED_INTERNAL_KEY_PATH}" "$(cat <<EOF
{
  "data": {
    "key": "${INTERNAL_API_KEY_VALUE}",
    "source": "simple-setup",
    "generated_at": "${CURRENT_TIME}"
  }
}
EOF
)"
else
    log "INF" "Reusing existing INTERNAL_API_KEY from Vault"
fi

if [[ "${WRITE_JWT_SECRET}" -eq 1 ]]; then
    vault_put "secret/data/jwt/auth" "$(cat <<EOF
{
  "data": {
    "secret_key": "${JWT_SECRET_VALUE}",
    "issuer": "transcendence",
    "expiration_hours": "24"
  }
}
EOF
)"
else
    log "INF" "Reusing existing JWT secret from Vault"
fi

if [[ -n "${OAUTH_42_CLIENT_ID}" && -n "${OAUTH_42_CLIENT_SECRET}" ]]; then
    vault_put "secret/data/api/oauth" "$(cat <<EOF
{
  "data": {
    "42_client_id": "${OAUTH_42_CLIENT_ID}",
    "42_client_secret": "${OAUTH_42_CLIENT_SECRET}",
    "42_redirect_uri": "${OAUTH_42_REDIRECT_URI}",
    "42_authorize_url": "${OAUTH_42_AUTHORIZE_URL}",
    "42_token_url": "${OAUTH_42_TOKEN_URL}",
    "42_profile_url": "${OAUTH_42_PROFILE_URL}",
    "42_scope": "${OAUTH_42_SCOPE}"
  }
}
EOF
)"
else
    EXISTING_OAUTH_CLIENT_ID="$(vault_read_field "secret/data/api/oauth" "42_client_id" || true)"
    EXISTING_OAUTH_CLIENT_SECRET="$(vault_read_field "secret/data/api/oauth" "42_client_secret" || true)"
    if [[ -n "${EXISTING_OAUTH_CLIENT_ID}" && -n "${EXISTING_OAUTH_CLIENT_SECRET}" ]]; then
        log "INF" "OAuth 42 secrets already present; skipping seed."
    else
        log "WRN" "Skipping OAuth 42 seed (set OAUTH_42_CLIENT_ID and OAUTH_42_CLIENT_SECRET to enable)."
    fi
fi

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
  "policy": "# Allow API Gateway to read JWT\npath \"secret/data/jwt/auth\" {\n  capabilities = [\"read\"]\n}\n\n# Allow API Gateway to read OAuth 42 credentials\npath \"secret/data/api/oauth\" {\n  capabilities = [\"read\"]\n}\n\n# Allow API Gateway to read shared internal key\npath \"secret/data/shared/internal-api-key\" {\n  capabilities = [\"read\"]\n}\n"
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

echo "${INTERNAL_API_KEY_VALUE}" > /tmp/internal-api-key.txt
log "INF" "Internal API key stored at /tmp/internal-api-key.txt"

if [[ "${WRITE_INTERNAL_API_KEY}" -eq 1 && -z "${EXISTING_INTERNAL_API_KEY}" && -z "${INTERNAL_API_KEY:-}" ]]; then
    log "INF" "Export INTERNAL_API_KEY=${INTERNAL_API_KEY_VALUE} before rerunning to reuse this value."
fi

log "INF" "Vault bootstrap complete ✅"
