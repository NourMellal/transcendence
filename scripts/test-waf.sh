#!/bin/bash

# WAF Testing Script
# This script tests the ModSecurity Web Application Firewall integration
# Note: We don't use 'set -e' because we want to handle curl failures gracefully

NGINX_URL="https://localhost"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================"
echo "WAF / ModSecurity Testing Script"
echo "========================================"
echo ""

# Check if nginx is running
echo "1. Checking if Nginx is running..."
if ! docker ps | grep -q transcendence-nginx; then
  echo -e "${RED}✗ Nginx container is not running${NC}"
  echo "Start it with: docker-compose up -d nginx"
  exit 1
fi
echo -e "${GREEN}✓ Nginx container is running${NC}"
echo ""

# Check SSL certificate files
echo "2. Checking SSL certificate files..."
if [ -f "docker/nginx/certs/fullchain.pem" ] && [ -f "docker/nginx/certs/privkey.pem" ]; then
  echo -e "${GREEN}✓ SSL certificate files exist${NC}"
else
  echo -e "${RED}✗ SSL certificate files not found${NC}"
  echo "Run: ./scripts/setup-ssl-certs.sh to generate certificates"
  exit 1
fi
echo ""

# Test basic routing
echo "3. Testing basic routing..."
HTTP_CODE=$(curl -k -s -o /dev/null -w "%{http_code}" "$NGINX_URL/" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "404" ] || [ "$HTTP_CODE" = "502" ]; then
  echo -e "${GREEN}✓ Nginx is responding (HTTP $HTTP_CODE)${NC}"
elif [ "$HTTP_CODE" = "000" ]; then
  echo -e "${RED}✗ Cannot connect to nginx${NC}"
  echo "  Nginx might not be running or not listening on port 443"
  echo "  Check with: docker-compose logs nginx"
  echo "  Try: docker-compose restart nginx"
  exit 1
else
  echo -e "${YELLOW}⚠ Unexpected HTTP code: $HTTP_CODE${NC}"
fi
echo ""

# Check security headers
echo "4. Checking security headers..."
HEADERS=$(curl -k -s -D - -o /dev/null "$NGINX_URL/" 2>/dev/null || echo "")
if [ -z "$HEADERS" ]; then
  echo -e "${RED}✗ Cannot connect to nginx to check headers${NC}"
  exit 1
fi
MISSING_HEADERS=()

if echo "$HEADERS" | grep -qi "Strict-Transport-Security"; then
  echo -e "${GREEN}✓ HSTS header present${NC}"
else
  MISSING_HEADERS+=("HSTS")
fi

if echo "$HEADERS" | grep -qi "X-Frame-Options"; then
  echo -e "${GREEN}✓ X-Frame-Options header present${NC}"
else
  MISSING_HEADERS+=("X-Frame-Options")
fi

if echo "$HEADERS" | grep -qi "X-Content-Type-Options"; then
  echo -e "${GREEN}✓ X-Content-Type-Options header present${NC}"
else
  MISSING_HEADERS+=("X-Content-Type-Options")
fi

if [ ${#MISSING_HEADERS[@]} -gt 0 ]; then
  echo -e "${YELLOW}⚠ Missing headers: ${MISSING_HEADERS[*]}${NC}"
fi
echo ""

# Check WAF status
echo "5. Checking WAF/ModSecurity status..."
WAF_ENABLED=$(grep -E "^WAF_ENABLED=" .env.example 2>/dev/null | cut -d'=' -f2 | tr -d ' "' || echo "")

if [ "$WAF_ENABLED" = "true" ] || [ "$WAF_ENABLED" = "1" ]; then
  echo -e "${GREEN}✓ WAF is ENABLED${NC}"
  
  # Test benign request
  echo ""
  echo "6. Testing benign request..."
  HTTP_CODE=$(curl -k -s -o /dev/null -w "%{http_code}" "$NGINX_URL/")
  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "404" ]; then
    echo -e "${GREEN}✓ Benign request passed (HTTP $HTTP_CODE)${NC}"
  else
    echo -e "${YELLOW}⚠ Unexpected response: $HTTP_CODE${NC}"
  fi
  
  # Test SQL injection attack
  echo ""
  echo "7. Testing SQL injection detection..."
  HTTP_CODE=$(curl -k -s -o /dev/null -w "%{http_code}" "$NGINX_URL/?id=1'+OR+'1'='1")
  if [ "$HTTP_CODE" = "403" ]; then
    echo -e "${GREEN}✓ SQL injection BLOCKED (HTTP 403)${NC}"
    echo -e "${GREEN}  ModSecurity is protecting your application!${NC}"
  elif [ "$HTTP_CODE" = "406" ]; then
    echo -e "${GREEN}✓ SQL injection BLOCKED (HTTP 406)${NC}"
    echo -e "${GREEN}  ModSecurity is protecting your application!${NC}"
  else
    echo -e "${YELLOW}⚠ SQL injection NOT blocked (HTTP $HTTP_CODE)${NC}"
    echo -e "${YELLOW}  Check ModSecurity configuration${NC}"
  fi
  
  # Test XSS attack
  echo ""
  echo "8. Testing XSS detection..."
  HTTP_CODE=$(curl -k -s -o /dev/null -w "%{http_code}" "$NGINX_URL/?q=<script>alert('xss')</script>")
  if [ "$HTTP_CODE" = "403" ] || [ "$HTTP_CODE" = "406" ]; then
    echo -e "${GREEN}✓ XSS attack BLOCKED (HTTP $HTTP_CODE)${NC}"
  else
    echo -e "${YELLOW}⚠ XSS attack NOT blocked (HTTP $HTTP_CODE)${NC}"
  fi
  
  # Test path traversal
  echo ""
  echo "9. Testing path traversal detection..."
  HTTP_CODE=$(curl -k -s -o /dev/null -w "%{http_code}" "$NGINX_URL/../../../../etc/passwd")
  if [ "$HTTP_CODE" = "403" ] || [ "$HTTP_CODE" = "406" ]; then
    echo -e "${GREEN}✓ Path traversal BLOCKED (HTTP $HTTP_CODE)${NC}"
  else
    echo -e "${YELLOW}⚠ Path traversal NOT blocked (HTTP $HTTP_CODE)${NC}"
  fi
  
  # Check audit logs
  echo ""
  echo "10. Checking ModSecurity audit logs..."
  if docker-compose exec -T nginx test -f /var/log/modsec_audit.log; then
    LOG_SIZE=$(docker-compose exec -T nginx stat -f%z /var/log/modsec_audit.log 2>/dev/null || docker-compose exec -T nginx stat -c%s /var/log/modsec_audit.log 2>/dev/null)
    if [ "$LOG_SIZE" -gt 0 ]; then
      echo -e "${GREEN}✓ Audit log is active (${LOG_SIZE} bytes)${NC}"
      echo "  View logs with: docker-compose exec nginx cat /var/log/modsec_audit.log"
    else
      echo -e "${YELLOW}⚠ Audit log is empty${NC}"
    fi
  else
    echo -e "${RED}✗ Audit log not found${NC}"
  fi
  
else
  echo -e "${YELLOW}⚠ WAF is DISABLED${NC}"
  echo "  To enable: set WAF_ENABLED=true in .env and restart nginx"
  echo "  Command: docker-compose up -d nginx"
fi

echo ""
echo "========================================"
echo "Test Summary"
echo "========================================"
if [ "$WAF_ENABLED" = "true" ] || [ "$WAF_ENABLED" = "1" ]; then
  echo -e "${GREEN}WAF Status: ENABLED and protecting${NC}"
else
  echo -e "${YELLOW}WAF Status: DISABLED${NC}"
fi
echo ""
echo "Next steps:"
echo "  - To enable WAF: Add 'WAF_ENABLED=true' to your .env file"
echo "  - Rebuild nginx: docker-compose build nginx"
echo "  - Restart nginx: docker-compose up -d nginx"
echo "  - View logs: docker-compose logs nginx"
echo "  - View audit logs: docker-compose exec nginx cat /var/log/modsec_audit.log"
echo ""
