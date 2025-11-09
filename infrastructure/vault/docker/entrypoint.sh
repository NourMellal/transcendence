#!/bin/bash
set -euo pipefail

VAULT_DEV_ROOT_TOKEN_ID="${VAULT_DEV_ROOT_TOKEN_ID:-dev-root-token}"
VAULT_DEV_LISTEN_ADDRESS="${VAULT_DEV_LISTEN_ADDRESS:-0.0.0.0:8200}"
VAULT_SEED_SECRETS="${VAULT_AUTO_SEED:-1}"
INTERNAL_VAULT_ADDR="http://127.0.0.1:8200"

echo "▶️  Starting Vault in dev mode (listen: ${VAULT_DEV_LISTEN_ADDRESS})"
vault server -dev \
    -dev-root-token-id="${VAULT_DEV_ROOT_TOKEN_ID}" \
    -dev-listen-address="${VAULT_DEV_LISTEN_ADDRESS}" &
VAULT_PID=$!

terminate() {
    echo "🛑 Stopping Vault..."
    kill "${VAULT_PID}" 2>/dev/null || true
    wait "${VAULT_PID}" 2>/dev/null || true
    exit 0
}

trap terminate INT TERM

wait_for_vault() {
    for i in $(seq 1 40); do
        if curl -s "${INTERNAL_VAULT_ADDR}/v1/sys/health" >/dev/null; then
            return 0
        fi
        sleep 1
    done
    return 1
}

if [[ "${VAULT_SEED_SECRETS}" != "0" ]]; then
    echo "⏳ Waiting for Vault to become ready..."
    if wait_for_vault; then
        echo "✅ Vault is ready – applying bootstrap secrets"
        VAULT_ADDR="${INTERNAL_VAULT_ADDR}" \
        VAULT_TOKEN="${VAULT_DEV_ROOT_TOKEN_ID}" \
        /vault/scripts/simple-setup.sh || echo "⚠️  Vault bootstrap script failed (continuing)"
    else
        echo "⚠️  Vault did not become ready in time; skipping bootstrap"
    fi
else
    echo "⚠️  Skipping automatic Vault secret bootstrap (VAULT_AUTO_SEED=0)"
fi

wait "${VAULT_PID}"
