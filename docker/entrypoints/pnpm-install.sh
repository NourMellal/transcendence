#!/usr/bin/env bash
set -euo pipefail
WORKSPACE_DIR=${WORKSPACE_DIR:-/workspace}
MARKER_FILE=${PNPM_INSTALL_MARKER:-.pnpm-installed}
cd "$WORKSPACE_DIR"
if [ -f "$MARKER_FILE" ]; then
  rm -f "$MARKER_FILE"
fi
pnpm install --no-frozen-lockfile
printf '%s\n' "$(date --iso-8601=seconds)" > "$MARKER_FILE"
exec tail -f /dev/null
