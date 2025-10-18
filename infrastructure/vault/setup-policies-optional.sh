#!/bin/bash
# =================================================================
# OPTIONAL: Apply Vault Policies (Advanced - Not Required for PFE)
# =================================================================
# This demonstrates policy-based access control
# Only run if you want to show advanced Vault features
# =================================================================

set -e

VAULT_ADDR="${VAULT_ADDR:-http://localhost:8200}"
VAULT_TOKEN="${VAULT_TOKEN:-dev-root-token}"

echo "🔐 Setting up Vault Policies (Optional Demo)..."
echo ""
echo "⚠️  NOTE: This is optional and adds complexity."
echo "    The simple-setup.sh is enough for PFE."
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled. Using simple dev mode is fine!"
    exit 0
fi

# Create API Gateway Policy from file
echo "📝 Creating API Gateway policy..."
POLICY_FILE="$(dirname "$0")/policies/api-gateway-policy.hcl"

if [ ! -f "$POLICY_FILE" ]; then
    echo "❌ Policy file not found: $POLICY_FILE"
    exit 1
fi

vault policy write api-gateway "$POLICY_FILE"

# Create token for API Gateway
echo "🔑 Creating token for API Gateway..."
GATEWAY_TOKEN=$(vault token create \
    -policy=api-gateway \
    -period=24h \
    -display-name="api-gateway" \
    -format=json | jq -r .auth.client_token)

echo ""
echo "✅ Policy setup complete!"
echo ""
echo "📋 API Gateway Token:"
echo "   $GATEWAY_TOKEN"
echo ""
echo "To use:"
echo "   export VAULT_TOKEN=$GATEWAY_TOKEN"
echo "   pnpm run dev:gateway"
echo ""
echo "💡 For PFE: This is optional. Using 'dev-root-token' for all services is fine!"
