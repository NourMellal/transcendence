#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"
ENV_EXAMPLE="${ROOT_DIR}/.env.example"
SEED_FILE="${ROOT_DIR}/infrastructure/vault/.seed.env"
SEED_EXAMPLE="${ROOT_DIR}/infrastructure/vault/.seed.env.example"
SEED_SOURCE="${SEED_SOURCE:-}"
SEED_FORCE="${SEED_FORCE:-0}"
SKIP_CERTS="${SKIP_CERTS:-0}"
INSTALL_DEPS="${INSTALL_DEPS:-0}"

log() {
    printf '%s\n' "$*"
}

copy_if_missing() {
    local src="$1"
    local dest="$2"
    local label="$3"

    if [[ -f "${dest}" ]]; then
        log "OK ${label} present"
        return 0
    fi
    if [[ ! -f "${src}" ]]; then
        log "WARN ${label} missing and no example found: ${src}"
        return 1
    fi
    cp "${src}" "${dest}"
    log "OK Created ${label} from ${src}"
}

log "=========================================="
log "Transcendence - Docker Canonical Setup"
log "=========================================="

copy_if_missing "${ENV_EXAMPLE}" "${ENV_FILE}" ".env"

if [[ -n "${SEED_SOURCE}" ]]; then
    if [[ ! -f "${SEED_SOURCE}" ]]; then
        log "ERR SEED_SOURCE not found: ${SEED_SOURCE}"
        exit 1
    fi
    if [[ ! -f "${SEED_FILE}" || "${SEED_FORCE}" == "1" ]]; then
        cp "${SEED_SOURCE}" "${SEED_FILE}"
        log "OK Copied Vault seed from ${SEED_SOURCE}"
    else
        log "OK Vault seed already present (${SEED_FILE})"
    fi
else
    if [[ ! -f "${SEED_FILE}" ]]; then
        copy_if_missing "${SEED_EXAMPLE}" "${SEED_FILE}" "Vault seed (.seed.env)"
        log "WARN Fill ${SEED_FILE} with OAUTH_42_CLIENT_ID and OAUTH_42_CLIENT_SECRET (from your private secrets repo)."
    else
        log "OK Vault seed already present (${SEED_FILE})"
    fi
fi

for target in \
    "${ROOT_DIR}/services/user-service/.env" \
    "${ROOT_DIR}/services/game-service/.env" \
    "${ROOT_DIR}/services/chat-service/.env" \
    "${ROOT_DIR}/services/tournament-service/.env" \
    "${ROOT_DIR}/infrastructure/api-gateway/.env" \
    "${ROOT_DIR}/apps/web/.env"; do
    example="${target}.example"
    copy_if_missing "${example}" "${target}" "$(basename "${target}")"
done

if [[ "${SKIP_CERTS}" != "1" ]]; then
    if [[ ! -f "${ROOT_DIR}/infrastructure/nginx/certs/fullchain.pem" || ! -f "${ROOT_DIR}/infrastructure/nginx/certs/privkey.pem" ]]; then
        log "SSL certs missing. Running scripts/setup-ssl-certs.sh..."
        "${ROOT_DIR}/scripts/setup-ssl-certs.sh"
    else
        log "OK SSL certs already present"
    fi
else
    log "WARN Skipping SSL cert setup (SKIP_CERTS=1)"
fi

if [[ "${INSTALL_DEPS}" == "1" ]]; then
    if ! command -v pnpm >/dev/null 2>&1; then
        log "ERR pnpm not found; install Node.js + corepack first."
        exit 1
    fi
    log "Installing workspace dependencies..."
    (cd "${ROOT_DIR}" && pnpm install --frozen-lockfile)
    log "OK pnpm install complete"
fi

log "=========================================="
log "OK Setup complete"
log "=========================================="
