#!/usr/bin/env bash

# Debian/Ubuntu bootstrap for Transcendence
# - Copies .env from .env.example if missing (single source of truth)
# - Ensures log and data directories exist with sane permissions
# - Verifies core dependencies (node, pnpm, docker, curl)
# - Runs pnpm install (skip with SKIP_INSTALL=1)
#
# Usage: bash scripts/setup-service.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"
ENV_EXAMPLE="${ROOT_DIR}/.env.example"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "=========================================="
echo "🔧 Transcendence - Debian/Ubuntu Setup"
echo "=========================================="

if command -v lsb_release >/dev/null 2>&1; then
    DISTRO=$(lsb_release -is)
else
    DISTRO=$(uname -s)
fi
echo -e "${BLUE}Target OS:${NC} ${DISTRO}"
echo ""

resolve_path() {
    local raw="$1"
    if [[ "$raw" = /* ]]; then
        printf "%s" "$raw"
    else
        printf "%s" "$ROOT_DIR/$raw"
    fi
}

ensure_dir() {
    local dir="$1"
    local label="$2"
    if mkdir -p "$dir" 2>/dev/null; then
        echo -e "${GREEN}✅ ${label}: ${dir}${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  ${label} not writable: ${dir}${NC}"
        return 1
    fi
}

normalize_perms() {
    local dir="$1"
    local label="$2"
    if [ ! -d "$dir" ]; then
        return
    fi
    # Try to ensure current user owns and can write
    if ! chown "$(id -u)":"$(id -g)" "$dir" 2>/dev/null; then
        echo -e "${YELLOW}⚠️  ${label} owned by another user. If this came from a previous sudo run, fix with:${NC} sudo chown -R $(id -u):$(id -g) \"$dir\""
    fi
    if ! chmod u+rwX,g+rwX "$dir" 2>/dev/null; then
        echo -e "${YELLOW}⚠️  Could not chmod ${label} (${dir}). Ensure it is writable for your user.${NC}"
    fi
}

missing_dep=0
require_cmd() {
    local cmd="$1"
    local hint="$2"
    if ! command -v "$cmd" >/dev/null 2>&1; then
        echo -e "${RED}❌ Missing dependency:${NC} ${cmd} (${hint})"
        missing_dep=1
    fi
}

echo -e "${BLUE}📝 Step 1: Environment file${NC}"
if [ ! -f "$ENV_FILE" ]; then
    cp "$ENV_EXAMPLE" "$ENV_FILE"
    sed -i 's/\r$//' "$ENV_FILE" 2>/dev/null || true
    echo -e "${GREEN}✅ Created .env from .env.example${NC}"
    echo -e "${YELLOW}⚠️  Review .env and update secrets before running services${NC}"
else
    sed -i 's/\r$//' "$ENV_FILE" 2>/dev/null || true
    echo -e "${GREEN}✅ .env present${NC}"
fi
echo ""

echo -e "${BLUE}📝 Step 1b: Service env files${NC}"
for svc in user-service game-service chat-service tournament-service; do
    svc_dir="${ROOT_DIR}/services/${svc}"
    svc_env="${svc_dir}/.env"
    svc_example="${svc_env}.example"
    if [ -f "$svc_example" ]; then
        if [ ! -f "$svc_env" ]; then
            cp "$svc_example" "$svc_env"
            sed -i 's/\r$//' "$svc_env" 2>/dev/null || true
            echo -e "${GREEN}✅ ${svc} .env created from example${NC}"
        else
            echo -e "${GREEN}✅ ${svc} .env present${NC}"
        fi
    fi
done
echo ""

echo -e "${BLUE}🔑 Step 2: Load environment${NC}"
set -a
source "$ENV_FILE"
set +a
echo -e "${GREEN}✅ Environment loaded from .env${NC}"
echo ""

echo -e "${BLUE}📂 Step 3: Prepare directories${NC}"
HOST_LOG_DIR_RESOLVED=$(resolve_path "${HOST_LOG_DIR:-./data/logs}")
ensure_dir "$HOST_LOG_DIR_RESOLVED" "Host log dir (HOST_LOG_DIR)"
normalize_perms "$HOST_LOG_DIR_RESOLVED" "Host log dir (HOST_LOG_DIR)"

LOG_DIR_RESOLVED=$(resolve_path "${LOG_DIR:-$HOST_LOG_DIR_RESOLVED}")
if ! ensure_dir "$LOG_DIR_RESOLVED" "Log dir (LOG_DIR)"; then
    FALLBACK_LOG_DIR="$ROOT_DIR/data/logs"
    ensure_dir "$FALLBACK_LOG_DIR" "Fallback log dir"
    LOG_DIR_RESOLVED="$FALLBACK_LOG_DIR"
    echo -e "${YELLOW}⚠️  LOG_DIR not writable. For local dev set LOG_DIR=./data/logs in .env or run with sudo when targeting /var/log${NC}"
fi
normalize_perms "$LOG_DIR_RESOLVED" "Log dir (LOG_DIR)"

declare -A DB_PATHS=(
    ["USER_SERVICE_DB_PATH"]="${USER_SERVICE_DB_PATH:-./data/user-service.db}"
    ["GAME_SERVICE_DB_PATH"]="${GAME_SERVICE_DB_PATH:-./data/game-service.db}"
    ["CHAT_SERVICE_DB_PATH"]="${CHAT_SERVICE_DB_PATH:-./data/chat-service.db}"
    ["TOURNAMENT_DB_PATH"]="${TOURNAMENT_DB_PATH:-./data/tournament-service.db}"
)

for var in "${!DB_PATHS[@]}"; do
    raw_path="${DB_PATHS[$var]}"
    resolved_path=$(resolve_path "$raw_path")
    db_dir=$(dirname "$resolved_path")
    if ! ensure_dir "$db_dir" "DB path for ${var}"; then
        echo -e "${YELLOW}   ➜ For local dev, set ${var}=./data/<service>.db in .env${NC}"
    fi
    normalize_perms "$db_dir" "DB dir for ${var}"
done
echo ""

echo -e "${BLUE}📂 Step 3b: Service data directories${NC}"
for svc in user-service game-service chat-service tournament-service; do
    svc_data="${ROOT_DIR}/services/${svc}/data"
    ensure_dir "$svc_data" "Service data dir (${svc})"
    normalize_perms "$svc_data" "Service data dir (${svc})"
done
echo ""

echo -e "${BLUE}🔍 Step 4: Dependency check${NC}"
require_cmd "curl" "apt install curl"
require_cmd "node" "install Node.js 22+"
require_cmd "docker" "apt install docker.io"

if command -v docker-compose >/dev/null 2>&1; then
    echo -e "${GREEN}✅ docker-compose available${NC}"
elif docker compose version >/dev/null 2>&1; then
    echo -e "${GREEN}✅ docker compose plugin available${NC}"
else
    echo -e "${RED}❌ Missing dependency:${NC} docker compose (apt install docker-compose-plugin)"
    missing_dep=1
fi

if ! command -v pnpm >/dev/null 2>&1; then
    if command -v corepack >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  pnpm missing, enabling via corepack...${NC}"
        corepack enable && corepack prepare pnpm@9.1.0 --activate || true
    else
        echo -e "${RED}❌ pnpm missing and corepack not available (install Node.js 22+).${NC}"
        missing_dep=1
    fi
fi

if [ $missing_dep -eq 1 ]; then
    echo -e "${RED}Please install missing dependencies and rerun the script.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Dependencies detected${NC}"
echo ""

echo -e "${BLUE}📦 Step 5: Install workspace deps${NC}"
if [ -z "${SKIP_INSTALL:-}" ]; then
    (cd "$ROOT_DIR" && pnpm install)
    echo -e "${GREEN}✅ pnpm install complete${NC}"
else
    echo -e "${YELLOW}⚠️  Skipping pnpm install (SKIP_INSTALL set)${NC}"
fi
echo ""

echo "=========================================="
echo -e "${GREEN}✅ Setup complete${NC}"
echo "=========================================="
echo "Effective paths:"
echo "  LOG_DIR:        ${LOG_DIR_RESOLVED}"
echo "  HOST_LOG_DIR:   ${HOST_LOG_DIR_RESOLVED}"
echo "  .env loaded:    ${ENV_FILE}"
echo "  Elastic index:  ${ELASTICSEARCH_INDEX_PREFIX:-transcendence-v2}"
echo "Recommended next steps:"
echo "  1) Review .env and set INTERNAL_API_KEY and VAULT_TOKEN as needed."
echo "  2) Start infra when ready: docker compose up -d rabbitmq vault redis"
echo "  3) Run services: pnpm dev:all"
echo ""
