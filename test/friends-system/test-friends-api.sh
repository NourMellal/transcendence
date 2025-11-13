#!/bin/bash

# Friends System API Test Script
# Tests the complete Friends System functionality

set -e  # Exit on any error

# Configuration
USER_SERVICE_URL="http://localhost:3001"
API_GATEWAY_URL="http://localhost:3000/api"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    ((TESTS_PASSED++))
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    ((TESTS_FAILED++))
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Test function
test_api() {
    local test_name="$1"
    local method="$2"
    local url="$3"
    local data="$4"
    local expected_status="$5"
    local headers="$6"

    log_info "Testing: $test_name"
    
    if [ -n "$data" ]; then
        if [ -n "$headers" ]; then
            response=$(curl -s -w "%{http_code}" -X "$method" \
                -H "Content-Type: application/json" \
                -H "$headers" \
                -d "$data" \
                "$url" || echo "000")
        else
            response=$(curl -s -w "%{http_code}" -X "$method" \
                -H "Content-Type: application/json" \
                -d "$data" \
                "$url" || echo "000")
        fi
    else
        if [ -n "$headers" ]; then
            response=$(curl -s -w "%{http_code}" -X "$method" \
                -H "$headers" \
                "$url" || echo "000")
        else
            response=$(curl -s -w "%{http_code}" -X "$method" \
                "$url" || echo "000")
        fi
    fi
    
    # Extract status code (last 3 characters)
    status_code="${response: -3}"
    response_body="${response%???}"
    
    if [ "$status_code" = "$expected_status" ]; then
        log_success "$test_name - Status: $status_code"
        echo "Response: $response_body"
        return 0
    else
        log_error "$test_name - Expected: $expected_status, Got: $status_code"
        echo "Response: $response_body"
        return 1
    fi
}

echo "==============================================="
echo "🧪 Friends System API Testing"
echo "==============================================="

# Check if user service is running
log_info "Checking if User Service is running..."
if ! curl -s "$USER_SERVICE_URL/health" > /dev/null 2>&1; then
    log_warning "User Service not running. Starting it..."
    
    # Start user service in background
    cd /home/abouguri/Transcendence42/services/user-service
    npm start &
    USER_SERVICE_PID=$!
    
    # Wait for service to start
    log_info "Waiting for User Service to start..."
    sleep 5
    
    # Check again
    if ! curl -s "$USER_SERVICE_URL/health" > /dev/null 2>&1; then
        log_error "Failed to start User Service"
        exit 1
    fi
    log_success "User Service started"
else
    log_success "User Service is already running"
fi

# Test variables
USER1_ID="user1-test-id"
USER2_ID="user2-test-id"
USER3_ID="user3-test-id"
FRIENDSHIP_ID=""

# Mock authentication headers (simulating API Gateway)
AUTH_HEADER_USER1="x-user-id: $USER1_ID"
AUTH_HEADER_USER2="x-user-id: $USER2_ID"
AUTH_HEADER_USER3="x-user-id: $USER3_ID"
INTERNAL_API_KEY="x-internal-api-key: test-key-12345"

echo ""
echo "==============================================="
echo "📝 Setup Test Data"
echo "==============================================="

# Create test users (this would normally be done through auth endpoints)
log_info "Creating test users..."

# Note: These would typically be created through the signup/auth endpoints
# For now, we'll assume they exist or create them directly in the database

echo ""
echo "==============================================="
echo "🔍 Test 1: Search Users"
echo "==============================================="

test_api "Search users - valid query" "GET" \
    "$USER_SERVICE_URL/users/search?query=test" \
    "" "200" "$AUTH_HEADER_USER1"

test_api "Search users - empty query" "GET" \
    "$USER_SERVICE_URL/users/search?query=" \
    "" "400" "$AUTH_HEADER_USER1"

test_api "Search users - short query" "GET" \
    "$USER_SERVICE_URL/users/search?query=x" \
    "" "400" "$AUTH_HEADER_USER1"

echo ""
echo "==============================================="
echo "📤 Test 2: Send Friend Requests"
echo "==============================================="

# Send friend request from user1 to user2
test_api "Send friend request - valid" "POST" \
    "$USER_SERVICE_URL/friends/requests" \
    "{\"toUserId\": \"$USER2_ID\", \"message\": \"Let's be friends!\"}" \
    "201" "$AUTH_HEADER_USER1"

# Try to send duplicate request
test_api "Send friend request - duplicate" "POST" \
    "$USER_SERVICE_URL/friends/requests" \
    "{\"toUserId\": \"$USER2_ID\"}" \
    "400" "$AUTH_HEADER_USER1"

# Try to send request to self
test_api "Send friend request - to self" "POST" \
    "$USER_SERVICE_URL/friends/requests" \
    "{\"toUserId\": \"$USER1_ID\"}" \
    "400" "$AUTH_HEADER_USER1"

# Send request with missing toUserId
test_api "Send friend request - missing toUserId" "POST" \
    "$USER_SERVICE_URL/friends/requests" \
    "{\"message\": \"Hi!\"}" \
    "400" "$AUTH_HEADER_USER1"

echo ""
echo "==============================================="
echo "📥 Test 3: Get Friend Requests"
echo "==============================================="

# Get pending requests for user2 (should have 1 from user1)
test_api "Get pending requests" "GET" \
    "$USER_SERVICE_URL/friends/requests/pending" \
    "" "200" "$AUTH_HEADER_USER2"

# Get sent requests for user1 (should have 1 to user2)
test_api "Get sent requests" "GET" \
    "$USER_SERVICE_URL/friends/requests/sent" \
    "" "200" "$AUTH_HEADER_USER1"

# Get pending requests for user1 (should have none)
test_api "Get pending requests - empty" "GET" \
    "$USER_SERVICE_URL/friends/requests/pending" \
    "" "200" "$AUTH_HEADER_USER1"

echo ""
echo "==============================================="
echo "✅ Test 4: Accept Friend Requests"
echo "==============================================="

# Note: We need to get the friendship ID from the pending requests
# For this test, we'll use a mock ID. In a real test, you'd parse the response from step 3
MOCK_FRIENDSHIP_ID="friendship-123"

test_api "Accept friend request - valid" "POST" \
    "$USER_SERVICE_URL/friends/requests/accept" \
    "{\"friendshipId\": \"$MOCK_FRIENDSHIP_ID\"}" \
    "200" "$AUTH_HEADER_USER2"

test_api "Accept friend request - not found" "POST" \
    "$USER_SERVICE_URL/friends/requests/accept" \
    "{\"friendshipId\": \"non-existent-id\"}" \
    "404" "$AUTH_HEADER_USER2"

test_api "Accept friend request - missing friendshipId" "POST" \
    "$USER_SERVICE_URL/friends/requests/accept" \
    "{}" \
    "400" "$AUTH_HEADER_USER2"

echo ""
echo "==============================================="
echo "❌ Test 5: Decline Friend Requests"
echo "==============================================="

# Send another request to test declining
test_api "Send request for decline test" "POST" \
    "$USER_SERVICE_URL/friends/requests" \
    "{\"toUserId\": \"$USER3_ID\"}" \
    "201" "$AUTH_HEADER_USER1"

MOCK_FRIENDSHIP_ID_2="friendship-456"

test_api "Decline friend request - valid" "POST" \
    "$USER_SERVICE_URL/friends/requests/decline" \
    "{\"friendshipId\": \"$MOCK_FRIENDSHIP_ID_2\"}" \
    "200" "$AUTH_HEADER_USER3"

echo ""
echo "==============================================="
echo "👥 Test 6: Get Friends List"
echo "==============================================="

# Get friends list for user1 (should have user2)
test_api "Get friends list - has friends" "GET" \
    "$USER_SERVICE_URL/friends" \
    "" "200" "$AUTH_HEADER_USER1"

# Get friends list for user3 (should be empty)
test_api "Get friends list - empty" "GET" \
    "$USER_SERVICE_URL/friends" \
    "" "200" "$AUTH_HEADER_USER3"

echo ""
echo "==============================================="
echo "🗑️ Test 7: Remove Friends"
echo "==============================================="

test_api "Remove friend - valid" "DELETE" \
    "$USER_SERVICE_URL/friends/$USER2_ID" \
    "" "200" "$AUTH_HEADER_USER1"

test_api "Remove friend - not friends" "DELETE" \
    "$USER_SERVICE_URL/friends/$USER3_ID" \
    "" "400" "$AUTH_HEADER_USER1"

test_api "Remove friend - non-existent user" "DELETE" \
    "$USER_SERVICE_URL/friends/non-existent-user" \
    "" "404" "$AUTH_HEADER_USER1"

echo ""
echo "==============================================="
echo "🔐 Test 8: Authentication Tests"
echo "==============================================="

test_api "Request without auth header" "GET" \
    "$USER_SERVICE_URL/friends" \
    "" "401" ""

test_api "Request with invalid auth header" "GET" \
    "$USER_SERVICE_URL/friends" \
    "" "401" "x-user-id: "

echo ""
echo "==============================================="
echo "📊 Test Results Summary"
echo "==============================================="

echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n🎉 ${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "\n❌ ${RED}Some tests failed. Please check the implementation.${NC}"
    exit 1
fi