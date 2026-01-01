#!/bin/sh
set -e

MODSEC_DIR=/etc/nginx/modsec
INCLUDE_FILE="$MODSEC_DIR/modsec_includes.conf"

if [ "$WAF_ENABLED" = "true" ] || [ "$WAF_ENABLED" = "1" ]; then
  echo "[entrypoint] WAF_ENABLED=true -> enabling ModSecurity include"
  if [ -f "$MODSEC_DIR/modsec_enabled.conf" ]; then
    ln -sf "$MODSEC_DIR/modsec_enabled.conf" "$INCLUDE_FILE"
  else
    echo "[entrypoint] Warning: $MODSEC_DIR/modsec_enabled.conf not found"
    rm -f "$INCLUDE_FILE" || true
  fi
else
  echo "[entrypoint] WAF not enabled -> disabling ModSecurity include"
  if [ -f "$MODSEC_DIR/modsec_disabled.conf" ]; then
    ln -sf "$MODSEC_DIR/modsec_disabled.conf" "$INCLUDE_FILE"
  else
    rm -f "$INCLUDE_FILE" || true
  fi
fi

exec "$@"
