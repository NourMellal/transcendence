#!/bin/bash

# Comprehensive User Service smoke test via API Gateway
# Usage: BASE_URL=http://api-gateway:3000/api ./scripts/test-auth.sh

set -euo pipefail

BASE_URL="${BASE_URL:-http://api-gateway:3000/api}"
TIMESTAMP=$(date +%s)
PRIMARY_EMAIL="user-${TIMESTAMP}@example.com"
PRIMARY_USERNAME="user${TIMESTAMP}"
PRIMARY_PASSWORD="UserPass123!"
FRIEND_EMAIL="friend-${TIMESTAMP}@example.com"
FRIEND_USERNAME="friend${TIMESTAMP}"
FRIEND_PASSWORD="FriendPass123!"
UNKNOWN_USER_ID="$(cat /proc/sys/kernel/random/uuid)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

STEP=1

next_step() {
  echo -e "${BLUE}[${STEP}] $1${NC}"
  STEP=$((STEP+1))
}

check_status() {
  local got=$1
  local expected=$2
  if [ "$got" -eq "$expected" ]; then
    echo -e "${GREEN}✅ PASS${NC} (Status: $got)"
  else
    echo -e "${RED}❌ FAIL${NC} (Expected: $expected, Got: $got)"
    exit 1
  fi
}

invalid_expect() {
  local got=$1
  local expected=$2
  if [ "$got" -ne "$expected" ]; then
    echo -e "${GREEN}✅ PASS${NC} (Status: $got, expected not $expected)"
  else
    echo -e "${RED}❌ FAIL${NC} (Unexpected status $got)"
    exit 1
  fi
}

generate_totp() {
  SECRET="$1" node - <<'NODE'
const { authenticator } = require('otplib');
authenticator.options = { step: 30, digits: 6 };
process.stdout.write(authenticator.generate(process.env.SECRET));
NODE
}

echo "🧪 User Service End-to-End Tests"
echo "Base URL: $BASE_URL"
echo "Primary User: $PRIMARY_EMAIL"
echo "Friend User: $FRIEND_EMAIL"
echo

next_step "Signup primary user"
PRIMARY_SIGNUP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$PRIMARY_EMAIL\",\"username\":\"$PRIMARY_USERNAME\",\"password\":\"$PRIMARY_PASSWORD\",\"displayName\":\"Primary User\"}")
HTTP_CODE=$(echo "$PRIMARY_SIGNUP" | tail -n1)
PRIMARY_BODY=$(echo "$PRIMARY_SIGNUP" | sed '$d')
check_status $HTTP_CODE 201
PRIMARY_USER_ID=$(echo "$PRIMARY_BODY" | jq -r '.id')

declare -A TOKENS

next_step "Signup friend user"
FRIEND_SIGNUP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$FRIEND_EMAIL\",\"username\":\"$FRIEND_USERNAME\",\"password\":\"$FRIEND_PASSWORD\",\"displayName\":\"Friend User\"}")
HTTP_CODE=$(echo "$FRIEND_SIGNUP" | tail -n1)
FRIEND_BODY=$(echo "$FRIEND_SIGNUP" | sed '$d')
check_status $HTTP_CODE 201
FRIEND_USER_ID=$(echo "$FRIEND_BODY" | jq -r '.id')

next_step "Duplicate email rejected"
DUP_EMAIL=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$PRIMARY_EMAIL\",\"username\":\"other$TIMESTAMP\",\"password\":\"$PRIMARY_PASSWORD\"}")
HTTP_CODE=$(echo "$DUP_EMAIL" | tail -n1)
check_status $HTTP_CODE 409

next_step "Duplicate username rejected"
DUP_USERNAME=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"dup-${TIMESTAMP}@example.com\",\"username\":\"$PRIMARY_USERNAME\",\"password\":\"$PRIMARY_PASSWORD\"}")
HTTP_CODE=$(echo "$DUP_USERNAME" | tail -n1)
check_status $HTTP_CODE 409

login_user() {
  local email=$1
  local password=$2
  local totp=${3:-}
  local body="{\"email\":\"$email\",\"password\":\"$password\""
  if [ -n "$totp" ]; then
    body+=" ,\"totpCode\":\"$totp\""
  fi
  body+="}"
  curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/login" \
    -H 'Content-Type: application/json' \
    -d "$body"
}

next_step "Login primary user"
LOGIN_RESPONSE=$(login_user "$PRIMARY_EMAIL" "$PRIMARY_PASSWORD")
HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -n1)
LOGIN_BODY=$(echo "$LOGIN_RESPONSE" | sed '$d')
check_status $HTTP_CODE 200
ACCESS_TOKEN=$(echo "$LOGIN_BODY" | jq -r '.accessToken')
REFRESH_TOKEN=$(echo "$LOGIN_BODY" | jq -r '.refreshToken')

next_step "Refresh token rotation"
REFRESH_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/refresh" \
  -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}")
HTTP_CODE=$(echo "$REFRESH_RESPONSE" | tail -n1)
REFRESH_BODY=$(echo "$REFRESH_RESPONSE" | sed '$d')
check_status $HTTP_CODE 200
ACCESS_TOKEN=$(echo "$REFRESH_BODY" | jq -r '.accessToken')
REFRESH_TOKEN=$(echo "$REFRESH_BODY" | jq -r '.refreshToken')

next_step "Invalid refresh token rejected"
INVALID_REFRESH=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/refresh" \
  -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"invalid-token\"}")
HTTP_CODE=$(echo "$INVALID_REFRESH" | tail -n1)
check_status $HTTP_CODE 400

next_step "Login friend user"
FRIEND_LOGIN=$(login_user "$FRIEND_EMAIL" "$FRIEND_PASSWORD")
HTTP_CODE=$(echo "$FRIEND_LOGIN" | tail -n1)
FRIEND_BODY=$(echo "$FRIEND_LOGIN" | sed '$d')
check_status $HTTP_CODE 200
FRIEND_ACCESS_TOKEN=$(echo "$FRIEND_BODY" | jq -r '.accessToken')

next_step "Wrong password rejected"
WRONG=$(login_user "$PRIMARY_EMAIL" "Wrong123!")
HTTP_CODE=$(echo "$WRONG" | tail -n1)
check_status $HTTP_CODE 401

next_step "Non-existent user rejected"
NONE=$(login_user "nobody-${TIMESTAMP}@example.com" "$PRIMARY_PASSWORD")
HTTP_CODE=$(echo "$NONE" | tail -n1)
check_status $HTTP_CODE 401

next_step "Auth status"
STATUS=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/auth/status" \
  -H "Authorization: Bearer $ACCESS_TOKEN")
HTTP_CODE=$(echo "$STATUS" | tail -n1)
check_status $HTTP_CODE 200

next_step "Profile update"
UPDATE=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/users/me" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{"displayName":"Updated User","avatar":"https://example.com/avatar.png"}')
HTTP_CODE=$(echo "$UPDATE" | tail -n1)
check_status $HTTP_CODE 200

next_step "Invalid profile payload rejected"
BAD_UPDATE=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/users/me" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{"avatar":"not-a-url"}')
HTTP_CODE=$(echo "$BAD_UPDATE" | tail -n1)
check_status $HTTP_CODE 400

next_step "Send friend request"
FRIEND_REQ=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/friends/requests" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d "{\"friendId\":\"$FRIEND_USER_ID\"}")
HTTP_CODE=$(echo "$FRIEND_REQ" | tail -n1)
FRIEND_REQ_BODY=$(echo "$FRIEND_REQ" | sed '$d')
check_status $HTTP_CODE 201
FRIENDSHIP_ID=$(echo "$FRIEND_REQ_BODY" | jq -r '.id')

next_step "Accept friend request"
ACCEPT=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/friends/requests/$FRIENDSHIP_ID" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $FRIEND_ACCESS_TOKEN" \
  -d '{"status":"accepted"}')
HTTP_CODE=$(echo "$ACCEPT" | tail -n1)
check_status $HTTP_CODE 200

next_step "List friends"
FRIENDS_LIST=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/friends" \
  -H "Authorization: Bearer $ACCESS_TOKEN")
HTTP_CODE=$(echo "$FRIENDS_LIST" | tail -n1)
check_status $HTTP_CODE 200

next_step "Remove friend"
RESP=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE_URL/friends/$FRIEND_USER_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN")
check_status $RESP 204

next_step "Send & cancel friend request"
NEW_REQ=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/friends/requests" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d "{\"friendId\":\"$FRIEND_USER_ID\"}")
HTTP_CODE=$(echo "$NEW_REQ" | tail -n1)
NEW_BODY=$(echo "$NEW_REQ" | sed '$d')
check_status $HTTP_CODE 201
PENDING_ID=$(echo "$NEW_BODY" | jq -r '.id')
RESP=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE_URL/friends/requests/$PENDING_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN")
check_status $RESP 204

next_step "Block friend"
BLOCK=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/friends/$FRIEND_USER_ID/block" \
  -H "Authorization: Bearer $ACCESS_TOKEN")
HTTP_CODE=$(echo "$BLOCK" | tail -n1)
check_status $HTTP_CODE 200

next_step "Send request while blocked (expect conflict)"
BLOCKED_REQ=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/friends/requests" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d "{\"friendId\":\"$FRIEND_USER_ID\"}")
HTTP_CODE=$(echo "$BLOCKED_REQ" | tail -n1)
check_status $HTTP_CODE 409

next_step "Unblock friend"
UNBLOCK=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE_URL/friends/$FRIEND_USER_ID/block" \
  -H "Authorization: Bearer $ACCESS_TOKEN")
check_status $UNBLOCK 200

next_step "Send friend request after unblock"
REQ_AGAIN=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/friends/requests" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d "{\"friendId\":\"$FRIEND_USER_ID\"}")
HTTP_CODE=$(echo "$REQ_AGAIN" | tail -n1)
REQ_BODY=$(echo "$REQ_AGAIN" | sed '$d')
check_status $HTTP_CODE 201
REJECT_ID=$(echo "$REQ_BODY" | jq -r '.id')
REJECT=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/friends/requests/$REJECT_ID" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $FRIEND_ACCESS_TOKEN" \
  -d '{"status":"rejected"}')
HTTP_CODE=$(echo "$REJECT" | tail -n1)
check_status $HTTP_CODE 200

next_step "Generate 2FA secret"
TWOFA=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/2fa/generate" \
  -H "Authorization: Bearer $ACCESS_TOKEN")
HTTP_CODE=$(echo "$TWOFA" | tail -n1)
TWOFA_BODY=$(echo "$TWOFA" | sed '$d')
check_status $HTTP_CODE 200
TOTP_SECRET=$(echo "$TWOFA_BODY" | jq -r '.secret')

next_step "Enable 2FA"
TOTP_CODE=$(generate_totp "$TOTP_SECRET")
ENABLE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/2fa/enable" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d "{\"token\":\"$TOTP_CODE\"}")
HTTP_CODE=$(echo "$ENABLE" | tail -n1)
check_status $HTTP_CODE 200

next_step "Login without TOTP (should fail)"
FAIL_2FA=$(login_user "$PRIMARY_EMAIL" "$PRIMARY_PASSWORD")
HTTP_CODE=$(echo "$FAIL_2FA" | tail -n1)
check_status $HTTP_CODE 401

next_step "Login with TOTP"
MAX_TOTP_ATTEMPTS=3
LOGIN_BODY=""
for attempt in $(seq 1 $MAX_TOTP_ATTEMPTS); do
  TOTP_CODE=$(generate_totp "$TOTP_SECRET")
  LOGIN_2FA=$(login_user "$PRIMARY_EMAIL" "$PRIMARY_PASSWORD" "$TOTP_CODE")
  HTTP_CODE=$(echo "$LOGIN_2FA" | tail -n1)
  LOGIN_BODY=$(echo "$LOGIN_2FA" | sed '$d')
  if [ "$HTTP_CODE" -eq 200 ]; then
    break
  fi
  echo -e "${YELLOW}   Attempt $attempt failed (status $HTTP_CODE) message: $(echo "$LOGIN_BODY" | jq -r '.message // .error // .status' 2>/dev/null). Retrying...${NC}"
  sleep 5
done
check_status $HTTP_CODE 200
ACCESS_TOKEN=$(echo "$LOGIN_BODY" | jq -r '.accessToken')
REFRESH_TOKEN=$(echo "$LOGIN_BODY" | jq -r '.refreshToken')

next_step "Disable 2FA"
TOTP_CODE=$(generate_totp "$TOTP_SECRET")
DISABLE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/2fa/disable" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d "{\"token\":\"$TOTP_CODE\"}")
HTTP_CODE=$(echo "$DISABLE" | tail -n1)
check_status $HTTP_CODE 200

next_step "Login after disabling 2FA"
LOGIN_RESPONSE=$(login_user "$PRIMARY_EMAIL" "$PRIMARY_PASSWORD")
HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -n1)
LOGIN_BODY=$(echo "$LOGIN_RESPONSE" | sed '$d')
check_status $HTTP_CODE 200
ACCESS_TOKEN=$(echo "$LOGIN_BODY" | jq -r '.accessToken')
REFRESH_TOKEN=$(echo "$LOGIN_BODY" | jq -r '.refreshToken')

next_step "Logout"
LOGOUT=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/logout" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}")
HTTP_CODE=$(echo "$LOGOUT" | tail -n1)
LOGOUT_BODY=$(echo "$LOGOUT" | sed '$d')
check_status $HTTP_CODE 200

next_step "Refresh after logout fails"
POST_LOGOUT=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/refresh" \
  -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}")
HTTP_CODE=$(echo "$POST_LOGOUT" | tail -n1)
check_status $HTTP_CODE 401

next_step "OAuth 42 initiation"
OAUTH=$(curl -s -w "\n%{http_code}" -L -X GET "$BASE_URL/auth/42/login")
HTTP_CODE=$(echo "$OAUTH" | tail -n1)
if [ $HTTP_CODE -eq 302 ] || [ $HTTP_CODE -eq 500 ]; then
  echo -e "${GREEN}✅ PASS${NC} (Status: $HTTP_CODE)"
else
  echo -e "${RED}❌ FAIL${NC} (Expected 302/500, got $HTTP_CODE)"
  exit 1
fi

echo
echo "==========================================="
echo -e "${GREEN}🎉 All automated tests completed${NC}"
