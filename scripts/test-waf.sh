#!/bin/sh
set -eu

HOST=${1:-https://localhost}

echo "Testing routing and headers against $HOST"

echo "\n1) Basic request to root (expect 200 or 404 depending on gateway)"
curl -s -o /dev/null -w "HTTP %{http_code}\n" -k "$HOST/"

echo "\n2) Check secure headers"
curl -s -D - -o /dev/null -k "$HOST/" | grep -i "strict-transport-security\|x-frame-options\|x-content-type-options" || echo "No secure headers found"

echo "\n3) Benign API health request (expect 200)"
curl -s -o /dev/null -w "HTTP %{http_code}\n" -k "$HOST/api/health" || echo "health endpoint failed"

echo "\n4) WAF test: SQLi-like payload (expect 403/406 if WAF blocking enabled)"
curl -si -k "$HOST/?id=1' OR '1'='1" | head -n 40

echo "\nIf you are running with ModSecurity in DetectionOnly mode, check modsec audit logs in the nginx container:" 
echo "  docker-compose exec nginx sh -c 'cat /var/log/modsec_audit.log || true'"
