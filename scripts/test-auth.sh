#!/bin/bash

# Manual Auth Flow Testing Script
# Usage: ./scripts/test-auth-manual.sh

set -e

BASE_URL="${BASE_URL:-http://localhost:3000/api}"
TIMESTAMP=$(date +%s)
TEST_EMAIL="test-${TIMESTAMP}@example.com"
TEST_USERNAME="user${TIMESTAMP}"
TEST_PASSWORD="TestPass123!"

echo "🧪 User Service Authentication Manual Tests"
echo "==========================================="
echo "Base URL: $BASE_URL"
echo "Test Email: $TEST_EMAIL"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper function
check_status() {
    if [ $1 -eq $2 ]; then
        echo -e "${GREEN}✅ PASS${NC} (Status: $1)"
    else
        echo -e "${RED}❌ FAIL${NC} (Expected: $2, Got: $1)"
        exit 1
    fi
}

# Test 1: Signup
echo -e "${BLUE}1️⃣  Testing SIGNUP${NC}"
echo "   POST $BASE_URL/auth/signup"
SIGNUP_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"username\": \"$TEST_USERNAME\",
    \"password\": \"$TEST_PASSWORD\",
    \"displayName\": \"Test User\"
  }")

HTTP_CODE=$(echo "$SIGNUP_RESPONSE" | tail -n1)
SIGNUP_BODY=$(echo "$SIGNUP_RESPONSE" | sed '$d')
check_status $HTTP_CODE 201

USER_ID=$(echo $SIGNUP_BODY | jq -r '.id')
echo "   User ID: $USER_ID"
echo "   Response: $(echo $SIGNUP_BODY | jq -c '.')"
echo ""

# Test 2: Duplicate Email
echo -e "${BLUE}2️⃣  Testing DUPLICATE EMAIL (should fail)${NC}"
echo "   POST $BASE_URL/auth/signup"
DUP_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"username\": \"different${TIMESTAMP}\",
    \"password\": \"$TEST_PASSWORD\"
  }")

HTTP_CODE=$(echo "$DUP_RESPONSE" | tail -n1)
DUP_BODY=$(echo "$DUP_RESPONSE" | sed '$d')
check_status $HTTP_CODE 409
echo "   Error: $(echo $DUP_BODY | jq -r '.message')"
echo ""

# Test 3: Duplicate Username
echo -e "${BLUE}3️⃣  Testing DUPLICATE USERNAME (should fail)${NC}"
echo "   POST $BASE_URL/auth/signup"
DUP_USER_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"different-${TIMESTAMP}@example.com\",
    \"username\": \"$TEST_USERNAME\",
    \"password\": \"$TEST_PASSWORD\"
  }")

HTTP_CODE=$(echo "$DUP_USER_RESPONSE" | tail -n1)
DUP_USER_BODY=$(echo "$DUP_USER_RESPONSE" | sed '$d')
check_status $HTTP_CODE 409
echo "   Error: $(echo $DUP_USER_BODY | jq -r '.message')"
echo ""

# Test 4: Login
echo -e "${BLUE}4️⃣  Testing LOGIN${NC}"
echo "   POST $BASE_URL/auth/login"
LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\"
  }")

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -n1)
LOGIN_BODY=$(echo "$LOGIN_RESPONSE" | sed '$d')
check_status $HTTP_CODE 200

ACCESS_TOKEN=$(echo $LOGIN_BODY | jq -r '.accessToken')
echo "   Token: ${ACCESS_TOKEN:0:50}..."
echo "   Message: $(echo $LOGIN_BODY | jq -r '.message')"
echo ""

# Test 5: Wrong Password
echo -e "${BLUE}5️⃣  Testing LOGIN with WRONG PASSWORD (should fail)${NC}"
echo "   POST $BASE_URL/auth/login"
WRONG_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"WrongPassword123!\"
  }")

HTTP_CODE=$(echo "$WRONG_RESPONSE" | tail -n1)
WRONG_BODY=$(echo "$WRONG_RESPONSE" | sed '$d')
check_status $HTTP_CODE 401
echo "   Error: $(echo $WRONG_BODY | jq -r '.message')"
echo ""

# Test 6: Non-existent User
echo -e "${BLUE}6️⃣  Testing LOGIN with NON-EXISTENT USER (should fail)${NC}"
echo "   POST $BASE_URL/auth/login"
NONEXIST_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"nonexistent-${TIMESTAMP}@example.com\",
    \"password\": \"$TEST_PASSWORD\"
  }")

HTTP_CODE=$(echo "$NONEXIST_RESPONSE" | tail -n1)
NONEXIST_BODY=$(echo "$NONEXIST_RESPONSE" | sed '$d')
check_status $HTTP_CODE 401
echo "   Error: $(echo $NONEXIST_BODY | jq -r '.message')"
echo ""

# Test 7: Auth Status
echo -e "${BLUE}7️⃣  Testing AUTH STATUS${NC}"
echo "   GET $BASE_URL/auth/status"
STATUS_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/auth/status" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

HTTP_CODE=$(echo "$STATUS_RESPONSE" | tail -n1)
STATUS_BODY=$(echo "$STATUS_RESPONSE" | sed '$d')
check_status $HTTP_CODE 200

IS_AUTH=$(echo $STATUS_BODY | jq -r '.authenticated')
echo "   Authenticated: $IS_AUTH"
echo "   User: $(echo $STATUS_BODY | jq -c '.user')"
echo ""

# Test 8: Update User Profile
echo -e "${BLUE}8️⃣  Testing UPDATE USER PROFILE${NC}"
echo "   PATCH $BASE_URL/users/me"
UPDATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/users/me" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d "{
    \"displayName\": \"Updated Test User\",
    \"avatar\": \"https://example.com/avatar.png\"
  }")

HTTP_CODE=$(echo "$UPDATE_RESPONSE" | tail -n1)
UPDATE_BODY=$(echo "$UPDATE_RESPONSE" | sed '$d')
check_status $HTTP_CODE 200
echo "   Updated User: $(echo $UPDATE_BODY | jq -c '.')"
echo ""

# Test 9: Generate 2FA
echo -e "${BLUE}9️⃣  Testing 2FA GENERATION${NC}"
echo "   POST $BASE_URL/auth/2fa/generate"
GEN_2FA_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/2fa/generate" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

HTTP_CODE=$(echo "$GEN_2FA_RESPONSE" | tail -n1)
GEN_2FA_BODY=$(echo "$GEN_2FA_RESPONSE" | sed '$d')
check_status $HTTP_CODE 200

TOTP_SECRET=$(echo $GEN_2FA_BODY | jq -r '.secret')
QR_CODE=$(echo $GEN_2FA_BODY | jq -r '.qrCode')
echo "   Secret: $TOTP_SECRET"
echo "   QR Code: [Base64 image - ${#QR_CODE} bytes]"
echo ""

# Test 10: Enable 2FA (requires manual TOTP input)
echo -e "${BLUE}🔟 Testing 2FA ENABLE${NC}"
echo -e "${YELLOW}⚠️  This step requires a TOTP code from an authenticator app${NC}"
echo "   To test manually:"
echo "   1. Copy the QR code base64 string above"
echo "   2. Open it in a browser or scan with Google Authenticator"
echo "   3. Get the 6-digit code"
echo "   4. Run:"
echo ""
echo "   curl -X POST $BASE_URL/auth/2fa/enable \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -H 'Authorization: Bearer $ACCESS_TOKEN' \\"
echo "     -d '{\"token\": \"YOUR_6_DIGIT_CODE\"}'"
echo ""
echo "   Expected: 200 OK with message 'Two-factor authentication enabled successfully'"
echo ""

# Test 11: Logout
echo -e "${BLUE}1️⃣1️⃣ Testing LOGOUT${NC}"
echo "   POST $BASE_URL/auth/logout"
LOGOUT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/logout" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

HTTP_CODE=$(echo "$LOGOUT_RESPONSE" | tail -n1)
LOGOUT_BODY=$(echo "$LOGOUT_RESPONSE" | sed '$d')
check_status $HTTP_CODE 200
echo "   Message: $(echo $LOGOUT_BODY | jq -r '.message')"
echo ""

# Test 12: OAuth 42 Login Initiation
echo -e "${BLUE}1️⃣2️⃣ Testing OAUTH 42 LOGIN INITIATION${NC}"
echo "   GET $BASE_URL/auth/42/login"
OAUTH_RESPONSE=$(curl -s -w "\n%{http_code}" -L -X GET "$BASE_URL/auth/42/login")

HTTP_CODE=$(echo "$OAUTH_RESPONSE" | tail -n1)
OAUTH_BODY=$(echo "$OAUTH_RESPONSE" | sed '$d')

# OAuth returns 500 if not configured, which is expected
if [ $HTTP_CODE -eq 302 ]; then
    echo -e "${GREEN}✅ PASS${NC} (Status: $HTTP_CODE - OAuth configured and redirecting)"
elif [ $HTTP_CODE -eq 500 ]; then
    echo -e "${YELLOW}⚠️  SKIP${NC} (Status: $HTTP_CODE - OAuth credentials not configured in Vault)"
    echo "   Error: $(echo $OAUTH_BODY | jq -r '.message' 2>/dev/null || echo 'OAuth service not initialized')"
else
    echo -e "${RED}❌ FAIL${NC} (Expected: 302 or 500, Got: $HTTP_CODE)"
    exit 1
fi

echo -e "${YELLOW}   ℹ️  OAuth flow requires browser interaction and configured secrets${NC}"
echo "   To configure OAuth 42:"
echo "   1. Register app at: https://profile.intra.42.fr/oauth/applications"
echo "   2. Add credentials to Vault:"
echo "      vault kv put secret/api/oauth \\"
echo "        oauth_42_client_id='your-client-id' \\"
echo "        oauth_42_client_secret='your-client-secret' \\"
echo "        oauth_42_redirect_uri='http://localhost:3000/api/auth/42/callback'"
echo ""

echo "==========================================="
echo -e "${GREEN}🎉 All automated tests PASSED!${NC}"
echo ""
echo "📝 Summary:"
echo "   ✅ Signup (success)"
echo "   ✅ Signup (duplicate email rejection)"
echo "   ✅ Signup (duplicate username rejection)"
echo "   ✅ Login (success)"
echo "   ✅ Login (wrong password rejection)"
echo "   ✅ Login (non-existent user rejection)"
echo "   ✅ Auth Status (authenticated)"
echo "   ✅ Update User Profile"
echo "   ✅ 2FA Generation"
echo "   ⚠️  2FA Enable (requires manual TOTP input)"
echo "   ✅ Logout"
echo "   ⚠️  OAuth 42 (requires browser + configured secrets)"
echo ""
echo "📖 For detailed manual testing guide, see: docs/MANUAL_TESTING_AUTH.md"
echo ""
echo "💾 Test Data Saved:"
echo "   export USER_ID='$USER_ID'"
echo "   export ACCESS_TOKEN='$ACCESS_TOKEN'"
echo "   export TOTP_SECRET='$TOTP_SECRET'"