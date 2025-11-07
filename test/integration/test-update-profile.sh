#!/bin/bash

# Test Update Profile Functionality
# This script tests the new /users/:id endpoints

BASE_URL="http://localhost:3001"
API_KEY="your-internal-api-key-for-gateway"
HEADERS="Content-Type: application/json"

echo "=========================================="
echo "Testing User Update Profile Functionality"
echo "=========================================="
echo ""

# Step 1: Create a test user
echo "1. Creating a test user..."
SIGNUP_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/signup" \
  -H "${HEADERS}" \
  -H "x-internal-api-key: ${API_KEY}" \
  -d '{
    "email": "testuser@example.com",
    "username": "testuser",
    "password": "Test123!",
    "displayName": "Test User"
  }')

echo "Signup Response:"
echo "$SIGNUP_RESPONSE" | jq
USER_ID=$(echo "$SIGNUP_RESPONSE" | jq -r '.id')
echo ""
echo "User ID: $USER_ID"
echo ""

# Step 2: Get user by ID
echo "2. Getting user by ID..."
GET_RESPONSE=$(curl -s -X GET "${BASE_URL}/users/${USER_ID}" \
  -H "x-internal-api-key: ${API_KEY}")

echo "Get User Response:"
echo "$GET_RESPONSE" | jq
echo ""

# Step 3: Update display name
echo "3. Updating display name..."
UPDATE_DISPLAY_NAME=$(curl -s -X PATCH "${BASE_URL}/users/${USER_ID}" \
  -H "${HEADERS}" \
  -H "x-internal-api-key: ${API_KEY}" \
  -d '{
    "displayName": "Updated Test User"
  }')

echo "Update Display Name Response:"
echo "$UPDATE_DISPLAY_NAME" | jq
echo ""

# Step 4: Update avatar
echo "4. Updating avatar..."
UPDATE_AVATAR=$(curl -s -X PATCH "${BASE_URL}/users/${USER_ID}" \
  -H "${HEADERS}" \
  -H "x-internal-api-key: ${API_KEY}" \
  -d '{
    "avatar": "https://example.com/avatar.png"
  }')

echo "Update Avatar Response:"
echo "$UPDATE_AVATAR" | jq
echo ""

# Step 5: Update email
echo "5. Updating email..."
UPDATE_EMAIL=$(curl -s -X PATCH "${BASE_URL}/users/${USER_ID}" \
  -H "${HEADERS}" \
  -H "x-internal-api-key: ${API_KEY}" \
  -d '{
    "email": "newemail@example.com"
  }')

echo "Update Email Response:"
echo "$UPDATE_EMAIL" | jq
echo ""

# Step 6: Update password
echo "6. Updating password..."
UPDATE_PASSWORD=$(curl -s -X PATCH "${BASE_URL}/users/${USER_ID}" \
  -H "${HEADERS}" \
  -H "x-internal-api-key: ${API_KEY}" \
  -d '{
    "password": "NewPass123!"
  }')

echo "Update Password Response:"
echo "$UPDATE_PASSWORD" | jq
echo ""

# Step 7: Try to login with new password
echo "7. Testing login with new password..."
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/login" \
  -H "${HEADERS}" \
  -H "x-internal-api-key: ${API_KEY}" \
  -d '{
    "email": "newemail@example.com",
    "password": "NewPass123!"
  }')

echo "Login Response:"
echo "$LOGIN_RESPONSE" | jq
echo ""

# Step 8: Test validation - invalid email
echo "8. Testing validation - invalid email..."
INVALID_EMAIL=$(curl -s -X PATCH "${BASE_URL}/users/${USER_ID}" \
  -H "${HEADERS}" \
  -H "x-internal-api-key: ${API_KEY}" \
  -d '{
    "email": "not-an-email"
  }')

echo "Invalid Email Response:"
echo "$INVALID_EMAIL" | jq
echo ""

# Step 9: Test validation - short display name
echo "9. Testing validation - empty display name..."
SHORT_DISPLAY=$(curl -s -X PATCH "${BASE_URL}/users/${USER_ID}" \
  -H "${HEADERS}" \
  -H "x-internal-api-key: ${API_KEY}" \
  -d '{
    "displayName": ""
  }')

echo "Empty Display Name Response:"
echo "$SHORT_DISPLAY" | jq
echo ""

# Step 10: Test validation - weak password
echo "10. Testing validation - weak password..."
WEAK_PASSWORD=$(curl -s -X PATCH "${BASE_URL}/users/${USER_ID}" \
  -H "${HEADERS}" \
  -H "x-internal-api-key: ${API_KEY}" \
  -d '{
    "password": "weak"
  }')

echo "Weak Password Response:"
echo "$WEAK_PASSWORD" | jq
echo ""

# Step 11: Get final user state
echo "11. Getting final user state..."
FINAL_USER=$(curl -s -X GET "${BASE_URL}/users/${USER_ID}" \
  -H "x-internal-api-key: ${API_KEY}")

echo "Final User State:"
echo "$FINAL_USER" | jq
echo ""

echo "=========================================="
echo "Test Complete!"
echo "=========================================="
