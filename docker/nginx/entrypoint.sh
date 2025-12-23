#!/bin/sh
set -e

MODSEC_RUN_DIR=/etc/nginx/modsec-run
INCLUDE_FILE="$MODSEC_RUN_DIR/modsec_includes.conf"

mkdir -p "$MODSEC_RUN_DIR"

if [ "$WAF_ENABLED" = "true" ] || [ "$WAF_ENABLED" = "1" ]; then
  echo "[entrypoint] WAF_ENABLED=true -> enabling ModSecurity include"
  if [ -f /etc/nginx/modsec/modsec_enabled.conf ]; then
    ln -sf /etc/nginx/modsec/modsec_enabled.conf "$INCLUDE_FILE"
  else
    echo "[entrypoint] Warning: /etc/nginx/modsec/modsec_enabled.conf not found"
    rm -f "$INCLUDE_FILE" || true
  fi
else
  echo "[entrypoint] WAF not enabled -> disabling ModSecurity include"
  if [ -f /etc/nginx/modsec/modsec_disabled.conf ]; then
    ln -sf /etc/nginx/modsec/modsec_disabled.conf "$INCLUDE_FILE"
  else
    rm -f "$INCLUDE_FILE" || true
  fi
fi

exec "$@"
