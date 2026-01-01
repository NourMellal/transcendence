#!/usr/bin/env bash
set -euo pipefail
WORKSPACE_DIR=${WORKSPACE_DIR:-/workspace}
MARKER_FILE=${PNPM_INSTALL_MARKER:-.pnpm-installed}
MAX_WAIT_SECONDS=${WAIT_FOR_PNPM_MAX_WAIT:-0}
SLEEP_INTERVAL=1
cd "$WORKSPACE_DIR"
COUNTER=0
if [ ! -f "$MARKER_FILE" ]; then
  echo "[wait-for-pnpm] Waiting for dependencies to be installed..."
fi
while [ ! -f "$MARKER_FILE" ]; do
  sleep "$SLEEP_INTERVAL"
  COUNTER=$((COUNTER + SLEEP_INTERVAL))
  if [ "$MAX_WAIT_SECONDS" -gt 0 ] && [ "$COUNTER" -ge "$MAX_WAIT_SECONDS" ]; then
    echo "[wait-for-pnpm] Timed out after ${MAX_WAIT_SECONDS}s" >&2
    exit 1
  fi
done
exec "$@"
