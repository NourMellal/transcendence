#!/bin/bash

# Run User Service Auth Integration Tests
# This script tests signup and login functionality

echo "🧪 Running User Service Auth Integration Tests"
echo ""

# Check if user service is running
if ! curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "❌ User service is not running on port 3001"
    echo ""
    echo "Please start the user service first:"
    echo "  cd services/user-service"
    echo "  pnpm dev"
    echo ""
    exit 1
fi

# Check if Vault is running
if ! curl -s http://localhost:8200/v1/sys/health > /dev/null 2>&1; then
    echo "❌ Vault is not running on port 8200"
    echo ""
    echo "Please start Vault first:"
    echo "  cd infrastructure/vault"
    echo "  ./simple-setup.sh"
    echo ""
    exit 1
fi

# Set environment variables
export VAULT_ADDR=http://localhost:8200
export VAULT_TOKEN=dev-root-token
export USER_SERVICE_URL=http://localhost:3001
export INTERNAL_API_KEY=test-internal-key
export NODE_ENV=development

# Run the test
node test/integration/test-user-service-auth.js

exit $?
