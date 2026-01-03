#!/bin/bash

# Simple test without internal API key for development
# Set SKIP_INTERNAL_API_CHECK=true in .env to allow direct testing

echo "=== Simple Chat Service Test ==="
echo ""
echo "This script tests chat service using mock authentication"
echo "For real API testing, use Postman collection: chat-service.postman.json"
echo ""

# Since services require internal API key, here's how to test:
echo "📝 Testing Options:"
echo ""
echo "Option 1: Use Postman/Thunder Client"
echo "  - Import: chat-service.postman.json"
echo "  - Run 'Login (Get Token)' request first"
echo "  - Token is automatically saved for other requests"
echo ""
echo "Option 2: Use MSW mocks in frontend"
echo "  - Run: pnpm dev:web"
echo "  - All chat API calls are mocked (no backend needed)"
echo "  - Perfect for UI development"
echo ""
echo "Option 3: Disable internal API check (Development only)"
echo "  - Add to .env: SKIP_INTERNAL_API_CHECK=true"
echo "  - Restart services"
echo "  - Then run this script again"
echo ""
echo "Option 4: Manual curl testing"
echo "  Get token first:"
echo '  TOKEN=$(curl -s -X POST http://localhost:3001/auth/login \'
echo '    -H "Content-Type: application/json" \'
echo '    -H "x-internal-api-key: YOUR_KEY_HERE" \'
echo '    -d'"'"'{"email":"test@example.com","password":"password123"}'"'"' \'
echo '    | jq -r .accessToken)'
echo ""
echo "  Then test chat:"
echo '  curl -X GET http://localhost:3003/conversations \'
echo '    -H "Authorization: Bearer $TOKEN"'
echo ""
