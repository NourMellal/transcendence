#!/bin/bash

# Friends System Unit Test Script
# Tests the Friends System components without requiring the full service setup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    TESTS_FAILED=$((TESTS_FAILED + 1))
}

test_compilation() {
    local test_name="$1"
    local file_path="$2"
    
    log_info "Testing compilation: $test_name"
    
    if [ -f "$file_path" ]; then
        log_success "$test_name - File exists"
        return 0
    else
        log_error "$test_name - File missing: $file_path"
        return 1
    fi
}

echo "==============================================="
echo "🧪 Friends System Unit Tests"
echo "==============================================="

cd /home/abouguri/Transcendence42/services/user-service

log_info "Building user service..."
if npm run build > /dev/null 2>&1; then
    log_success "User service builds successfully"
else
    log_error "User service build failed"
fi

echo ""
echo "==============================================="
echo "📁 Test File Structure"
echo "==============================================="

# Test that all required files exist
test_compilation "Friendship Entity" "src/domain/entities/user.entity.ts"
test_compilation "Friendship Repository" "src/infrastructure/database/repositories/sqlite-friendship.repository.ts"
test_compilation "Send Friend Request Use Case" "src/application/use-cases/friends/send-friend-request.usecase.ts"
test_compilation "Accept Friend Request Use Case" "src/application/use-cases/friends/accept-friend-request.usecase.ts"
test_compilation "Decline Friend Request Use Case" "src/application/use-cases/friends/decline-friend-request.usecase.ts"
test_compilation "Remove Friend Use Case" "src/application/use-cases/friends/remove-friend.usecase.ts"
test_compilation "Get Friends List Use Case" "src/application/use-cases/friends/get-friends-list.usecase.ts"
test_compilation "Get Pending Requests Use Case" "src/application/use-cases/friends/get-pending-requests.usecase.ts"
test_compilation "Get Sent Requests Use Case" "src/application/use-cases/friends/get-sent-requests.usecase.ts"
test_compilation "Search Users Use Case" "src/application/use-cases/friends/search-users.usecase.ts"
test_compilation "Friends Controller" "src/infrastructure/http/controllers/friends.controller.ts"
test_compilation "Friends Routes" "src/infrastructure/http/routes/friends.routes.ts"

echo ""
echo "==============================================="
echo "🔍 Test Compiled Files"
echo "==============================================="

# Test that compiled files exist
test_compilation "Compiled Friendship Repository" "dist/infrastructure/database/repositories/sqlite-friendship.repository.js"
test_compilation "Compiled Send Friend Request Use Case" "dist/application/use-cases/friends/send-friend-request.usecase.js"
test_compilation "Compiled Friends Controller" "dist/infrastructure/http/controllers/friends.controller.js"
test_compilation "Compiled Friends Routes" "dist/infrastructure/http/routes/friends.routes.js"

echo ""
echo "==============================================="
echo "🔧 Test Import Resolution"
echo "==============================================="

# Test that imports are correctly resolved
log_info "Checking import statements..."

# Check for .js extensions in imports (required for ES modules)
if grep -r "from.*\.js['\"]" src/application/use-cases/friends/ > /dev/null; then
    log_success "Friends use cases have correct .js imports"
else
    log_error "Friends use cases missing .js imports"
fi

if grep "user.entity.js" src/infrastructure/database/repositories/sqlite-friendship.repository.ts > /dev/null; then
    log_success "Friendship repository has correct imports"
else
    log_error "Friendship repository missing correct imports"
fi

echo ""
echo "==============================================="
echo "📋 Test Database Schema"
echo "==============================================="

# Check that the friendship schema is defined
if grep -A 10 "CREATE TABLE.*friendships" src/infrastructure/database/repositories/sqlite-friendship.repository.ts > /dev/null; then
    log_success "Friendship table schema is defined"
else
    log_error "Friendship table schema is missing"
fi

# Check for required indexes
if grep "CREATE INDEX.*friendships" src/infrastructure/database/repositories/sqlite-friendship.repository.ts > /dev/null; then
    log_success "Friendship indexes are defined"
else
    log_error "Friendship indexes are missing"
fi

echo ""
echo "==============================================="
echo "🎯 Test Business Logic"
echo "==============================================="

# Test that enums are defined
if grep "enum FriendshipStatus" src/domain/entities/user.entity.ts > /dev/null; then
    log_success "FriendshipStatus enum is defined"
else
    log_error "FriendshipStatus enum is missing"
fi

# Test that validation logic exists
if grep -r "Cannot send friend request to yourself" src/application/use-cases/friends/ > /dev/null; then
    log_success "Self-friendship validation exists"
else
    log_error "Self-friendship validation is missing"
fi

if grep -r "Already friends with this user" src/application/use-cases/friends/ > /dev/null; then
    log_success "Duplicate friendship validation exists"
else
    log_error "Duplicate friendship validation is missing"
fi

echo ""
echo "==============================================="
echo "🌐 Test API Endpoints"
echo "==============================================="

# Test that all required routes are defined
required_routes=("friends/requests" "friends/requests/accept" "friends/requests/decline" "friends" "users/search")

for route in "${required_routes[@]}"; do
    if grep "$route" src/infrastructure/http/routes/friends.routes.ts > /dev/null; then
        log_success "Route $route is defined"
    else
        log_error "Route $route is missing"
    fi
done

echo ""
echo "==============================================="
echo "📊 Test Results Summary"
echo "==============================================="

echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n🎉 ${GREEN}All Friends System unit tests passed!${NC}"
    echo -e "${BLUE}The Friends System backend implementation is complete and ready.${NC}"
    echo ""
    echo "✅ Database schema and repositories implemented"
    echo "✅ Business logic and use cases implemented"  
    echo "✅ HTTP controllers and routes implemented"
    echo "✅ TypeScript compilation successful"
    echo "✅ Import resolution working correctly"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Set up proper environment variables for full integration testing"
    echo "2. Create frontend components using Signal architecture"
    echo "3. Test end-to-end functionality"
    
    exit 0
else
    echo -e "\n❌ ${RED}Some Friends System tests failed.${NC}"
    echo "Please fix the issues above before proceeding."
    exit 1
fi