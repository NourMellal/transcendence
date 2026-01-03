#!/bin/bash

# Test script for chat service
# This script helps test chat service endpoints with authentication

echo "=== Chat Service Test Script ==="
echo ""

# Get internal API key from Vault
INTERNAL_API_KEY=$(curl -s -H "X-Vault-Token: dev-root-token" \
  http://localhost:8200/v1/secret/data/shared/internal-api-key | \
  jq -r '.data.data.key // "dev-internal-api-key-12345"')

echo "Using Internal API Key: ${INTERNAL_API_KEY:0:10}..."
echo ""

# Step 1: Register/Login to get JWT token
echo "1. Logging in to user-service..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -H "x-internal-api-key: $INTERNAL_API_KEY" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }')

# Extract access token
ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.accessToken // .access_token // .token')

if [ "$ACCESS_TOKEN" == "null" ] || [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Login failed. Trying to signup first..."
  
  # Try signup
  SIGNUP_RESPONSE=$(curl -s -X POST http://localhost:3001/auth/signup \
    -H "Content-Type: application/json" \
    -H "x-internal-api-key: $INTERNAL_API_KEY" \
    -d '{
      "username": "testuser",
      "email": "test@example.com",
      "password": "password123"
    }')
  
  echo "Signup response: $SIGNUP_RESPONSE"
  
  # Try login again
  LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/auth/login \
    -H "Content-Type: application/json" \
    -H "x-internal-api-key: $INTERNAL_API_KEY" \
    -d '{
      "email": "test@example.com",
      "password": "password123"
    }')
  
  ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.accessToken // .access_token // .token')
fi

if [ "$ACCESS_TOKEN" == "null" ] || [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Failed to get access token"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Got access token: ${ACCESS_TOKEN:0:20}..."
echo ""

# Step 2: Test chat service endpoints
echo "2. Testing chat service endpoints..."
echo ""

# Test: Get conversations
echo "📋 GET /conversations"
curl -X GET http://localhost:3003/chat/conversations \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "x-internal-api-key: $INTERNAL_API_KEY" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n"
echo ""

# Test: Send a message
echo "📤 POST /messages (direct message)"
curl -X POST http://localhost:3003/chat/messages \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "x-internal-api-key: $INTERNAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Hello from test script!",
    "type": "DIRECT",
    "recipientId": "test-recipient-id"
  }' \
  -w "\nStatus: %{http_code}\n"
echo ""

# Test: Get messages
echo "📥 GET /messages"
curl -X GET "http://localhost:3003/chat/messages?type=DIRECT&recipientId=test-recipient-id&limit=10" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "x-internal-api-key: $INTERNAL_API_KEY" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n"
echo ""

echo "=== Test completed ==="
