#!/bin/bash
# =======================================================================
# Vault Integration Validation Script
# =======================================================================
# Validates that all services can access their required secrets
# =======================================================================

set -uo pipefail

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

VAULT_ADDR="${VAULT_ADDR:-http://localhost:8200}"
VAULT_TOKEN="${VAULT_TOKEN:-dev-root-token-123}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  VAULT INTEGRATION VALIDATION${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0
TOTAL_TESTS=0

test_secret() {
    local path=$1
    local description=$2
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if curl -s -H "X-Vault-Token: $VAULT_TOKEN" \
        "$VAULT_ADDR/v1/secret/data/$path" | grep -q '"data"'; then
        echo -e "${GREEN}✅${NC} $description"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}❌${NC} $description"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

echo -e "${BLUE}📋 Testing Vault Health...${NC}"
if curl -s "$VAULT_ADDR/v1/sys/health" | grep -q '"initialized":true'; then
    echo -e "${GREEN}✅${NC} Vault is healthy and initialized"
else
    echo -e "${RED}❌${NC} Vault is not accessible"
    exit 1
fi
echo ""

echo -e "${BLUE}🔐 Testing Service Secrets Access...${NC}"
echo ""

echo -e "${YELLOW}User Service:${NC}"
test_secret "database/user-service" "  Database configuration"
test_secret "jwt/auth" "  JWT authentication"
test_secret "api/oauth" "  OAuth API credentials"
echo ""

echo -e "${YELLOW}Game Service:${NC}"
test_secret "database/game-service" "  Database configuration"
test_secret "game/config" "  Game configuration"
echo ""

echo -e "${YELLOW}Chat Service:${NC}"
test_secret "database/chat-service" "  Database configuration"
test_secret "chat/config" "  Chat configuration"
echo ""

echo -e "${YELLOW}Tournament Service:${NC}"
test_secret "database/tournament-service" "  Database configuration"
echo ""

echo -e "${YELLOW}API Gateway:${NC}"
test_secret "gateway/config" "  Gateway configuration"
test_secret "jwt/auth" "  JWT validation"
echo ""

echo -e "${BLUE}📊 Testing Secret Engines...${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if curl -s -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/sys/mounts" | grep -q '"secret/"'; then
    echo -e "${GREEN}✅${NC} KV v2 secrets engine enabled"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}❌${NC} KV v2 secrets engine not found"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

echo -e "${BLUE}🔑 Testing Authentication...${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if curl -s -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/auth/token/lookup-self" | grep -q '"policies"'; then
    echo -e "${GREEN}✅${NC} Token authentication working"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}❌${NC} Token authentication failed"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  VALIDATION SUMMARY${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
SUCCESS_RATE=$((TESTS_PASSED * 100 / TOTAL_TESTS))
echo -e "Success Rate: ${SUCCESS_RATE}%"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL VALIDATIONS PASSED!${NC}"
    echo -e "${GREEN}Vault integration is working correctly.${NC}"
    echo ""
    echo -e "${BLUE}✅ Services can access their secrets${NC}"
    echo -e "${BLUE}✅ Authentication is working${NC}"
    echo -e "${BLUE}✅ Secret engines are properly configured${NC}"
    echo ""
    echo -e "${GREEN}Ready for service deployment!${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  Some validations failed${NC}"
    echo -e "Please check the output above for details."
    exit 1
fi