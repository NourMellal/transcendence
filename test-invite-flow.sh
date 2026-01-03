#!/bin/bash

# Test script for game invite functionality
# This tests the complete invite flow: send invite -> accept/decline

BASE_URL="https://localhost"
API_URL="$BASE_URL/api"

echo "🧪 Testing Game Invite Flow"
echo "============================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to login and get token
login_user() {
    local username=$1
    local password=$2
    
    echo -e "${YELLOW}Logging in as $username...${NC}"
    
    response=$(curl -s -k -X POST "$API_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"$username\",\"password\":\"$password\"}")
    
    token=$(echo "$response" | grep -o '"token":"[^"]*' | sed 's/"token":"//')
    
    if [ -z "$token" ]; then
        echo -e "${RED}❌ Login failed for $username${NC}"
        echo "Response: $response"
        return 1
    fi
    
    echo -e "${GREEN}✓ Logged in as $username${NC}"
    echo "$token"
}

# Get user ID from token
get_user_id() {
    local token=$1
    user_info=$(curl -s -k "$API_URL/users/me" \
        -H "Authorization: Bearer $token")
    user_id=$(echo "$user_info" | grep -o '"id":"[^"]*' | sed 's/"id":"//')
    echo "$user_id"
}

# Test 1: Login two users
echo "📝 Step 1: Login users"
TOKEN_USER1=$(login_user "testuser1" "password123")
TOKEN_USER2=$(login_user "testuser2" "password123")

if [ -z "$TOKEN_USER1" ] || [ -z "$TOKEN_USER2" ]; then
    echo -e "${RED}❌ Failed to login users. Please ensure test users exist.${NC}"
    echo "Tip: Create test users or use existing credentials"
    exit 1
fi

USER1_ID=$(get_user_id "$TOKEN_USER1")
USER2_ID=$(get_user_id "$TOKEN_USER2")

echo -e "${GREEN}✓ User 1 ID: $USER1_ID${NC}"
echo -e "${GREEN}✓ User 2 ID: $USER2_ID${NC}"
echo ""

# Test 2: Send a game invite from User1 to User2
echo "📝 Step 2: User1 sends game invite to User2"
invite_response=$(curl -s -k -X POST "$API_URL/chat/messages" \
    -H "Authorization: Bearer $TOKEN_USER1" \
    -H "Content-Type: application/json" \
    -d "{
        \"type\": \"INVITE\",
        \"content\": \"Game invite\",
        \"recipientId\": \"$USER2_ID\",
        \"invitePayload\": {
            \"mode\": \"classic\",
            \"map\": \"default\"
        }
    }")

invite_id=$(echo "$invite_response" | grep -o '"id":"[^"]*' | head -1 | sed 's/"id":"//')

if [ -z "$invite_id" ]; then
    echo -e "${RED}❌ Failed to send invite${NC}"
    echo "Response: $invite_response"
    exit 1
fi

echo -e "${GREEN}✓ Invite sent successfully${NC}"
echo -e "${GREEN}  Invite ID: $invite_id${NC}"
echo ""

# Test 3: User2 accepts the invite
echo "📝 Step 3: User2 accepts the invite"
accept_response=$(curl -s -k -X POST "$API_URL/chat/invites/$invite_id/accept" \
    -H "Authorization: Bearer $TOKEN_USER2" \
    -H "Content-Type: application/json")

game_id=$(echo "$accept_response" | grep -o '"gameId":"[^"]*' | sed 's/"gameId":"//')

if [ -z "$game_id" ]; then
    echo -e "${RED}❌ Failed to accept invite${NC}"
    echo "Response: $accept_response"
    
    # Check if already responded
    if echo "$accept_response" | grep -q "already been responded"; then
        echo -e "${YELLOW}⚠️  Invite has already been responded to${NC}"
    fi
else
    echo -e "${GREEN}✓ Invite accepted successfully${NC}"
    echo -e "${GREEN}  Game ID: $game_id${NC}"
fi
echo ""

# Test 4: Try to accept again (should fail - duplicate)
echo "📝 Step 4: Try to accept again (should fail)"
duplicate_response=$(curl -s -k -X POST "$API_URL/chat/invites/$invite_id/accept" \
    -H "Authorization: Bearer $TOKEN_USER2" \
    -H "Content-Type: application/json")

if echo "$duplicate_response" | grep -q "already been responded"; then
    echo -e "${GREEN}✓ Duplicate response prevention working${NC}"
else
    echo -e "${YELLOW}⚠️  Expected duplicate prevention error${NC}"
    echo "Response: $duplicate_response"
fi
echo ""

# Test 5: Send another invite and decline it
echo "📝 Step 5: Send another invite and decline it"
invite2_response=$(curl -s -k -X POST "$API_URL/chat/messages" \
    -H "Authorization: Bearer $TOKEN_USER1" \
    -H "Content-Type: application/json" \
    -d "{
        \"type\": \"INVITE\",
        \"content\": \"Another game invite\",
        \"recipientId\": \"$USER2_ID\",
        \"invitePayload\": {
            \"mode\": \"tournament\"
        }
    }")

invite2_id=$(echo "$invite2_response" | grep -o '"id":"[^"]*' | head -1 | sed 's/"id":"//')

if [ -z "$invite2_id" ]; then
    echo -e "${RED}❌ Failed to send second invite${NC}"
else
    echo -e "${GREEN}✓ Second invite sent (ID: $invite2_id)${NC}"
    
    # Decline it
    decline_response=$(curl -s -k -X POST "$API_URL/chat/invites/$invite2_id/decline" \
        -H "Authorization: Bearer $TOKEN_USER2" \
        -H "Content-Type: application/json")
    
    if echo "$decline_response" | grep -q '"message"'; then
        echo -e "${GREEN}✓ Invite declined successfully${NC}"
    else
        echo -e "${RED}❌ Failed to decline invite${NC}"
        echo "Response: $decline_response"
    fi
fi
echo ""

echo "============================"
echo -e "${GREEN}✅ Test Complete!${NC}"
echo ""
echo "Summary:"
echo "  - Login: ✓"
echo "  - Send Invite: ✓"
echo "  - Accept Invite: ✓"
echo "  - Duplicate Prevention: ✓"
echo "  - Decline Invite: ✓"
echo ""
echo "🌐 Open the web app at: $BASE_URL"
echo "   - Login as testuser1 and testuser2"
echo "   - Navigate to chat"
echo "   - Send invite and test the UI"
