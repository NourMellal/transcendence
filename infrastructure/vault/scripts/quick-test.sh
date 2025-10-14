#!/bin/bash
# Simple Vault Health Test
# This script tests basic Vault connectivity and functionality

VAULT_ADDR="${VAULT_ADDR:-http://localhost:8200}"
VAULT_TOKEN="${VAULT_TOKEN:-dev-root-token-123}"

echo "🧪 Testing Vault System..."
echo "Vault Address: $VAULT_ADDR"
echo ""

# Test 1: Health Check
echo "1️⃣ Testing Vault Health..."
if curl -s "$VAULT_ADDR/v1/sys/health" > /tmp/vault-health.json; then
    if grep -q '"initialized":true' /tmp/vault-health.json; then
        echo "✅ Vault is healthy and initialized"
    else
        echo "❌ Vault is not initialized"
        exit 1
    fi
else
    echo "❌ Cannot connect to Vault"
    echo "   Make sure Vault is running at $VAULT_ADDR"
    echo ""
    echo "🚀 To start Vault in development mode:"
    echo "   docker run --rm -d --name vault-test -p 8200:8200 \\"
    echo "     --cap-add=IPC_LOCK \\"
    echo "     -e 'VAULT_DEV_ROOT_TOKEN_ID=dev-root-token-123' \\"
    echo "     hashicorp/vault:1.15"
    exit 1
fi

# Test 2: Authentication
echo "2️⃣ Testing Authentication..."
if curl -s -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/auth/token/lookup-self" > /tmp/vault-auth.json; then
    echo "✅ Token authentication successful"
else
    echo "❌ Token authentication failed"
    exit 1
fi

# Test 3: Secret Operations
echo "3️⃣ Testing Secret Operations..."
TEST_SECRET='{"data": {"test_key": "test_value", "timestamp": "'$(date)'"}}'

# Write secret
if curl -s -X POST \
    -H "X-Vault-Token: $VAULT_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$TEST_SECRET" \
    "$VAULT_ADDR/v1/secret/data/test/system-test" > /tmp/vault-write.json; then
    echo "✅ Secret write successful"
else
    echo "❌ Secret write failed"
    exit 1
fi

# Read secret
if curl -s -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/secret/data/test/system-test" > /tmp/vault-read.json; then
    if grep -q "test_value" /tmp/vault-read.json; then
        echo "✅ Secret read successful"
    else
        echo "❌ Secret read returned wrong data"
        exit 1
    fi
else
    echo "❌ Secret read failed"
    exit 1
fi

# Clean up test secret
curl -s -X DELETE -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/secret/data/test/system-test" > /dev/null

echo "4️⃣ Testing TypeScript Client Files..."
if [ -f "../packages/shared-utils/src/vault/client.ts" ]; then
    echo "✅ TypeScript client files exist"
else
    echo "❌ TypeScript client files not found"
    exit 1
fi

echo ""
echo "🎉 ALL BASIC TESTS PASSED!"
echo ""
echo "💡 Next steps:"
echo "   1. Initialize Vault with policies: ./infrastructure/vault/scripts/init-vault.sh dev"
echo "   2. Run comprehensive tests: ./infrastructure/vault/scripts/test-vault-system.sh"
echo "   3. Test TypeScript client: cd test/vault-test && node test-vault-client.js"
echo ""
echo "🌐 Access Vault UI at: http://localhost:8200/ui"
echo "🔑 Login token: dev-root-token-123"