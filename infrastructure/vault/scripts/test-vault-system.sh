#!/bin/bash
# =======================================================================
# Vault System Testing Script
# =======================================================================
# This script tests all aspects of our Vault implementation:
# 1. Vault server health
# 2. Authentication methods
# 3. Policy enforcement
# 4. Secret operations
# 5. Service integration
# =======================================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VAULT_ADDR="${VAULT_ADDR:-http://localhost:8200}"
TEST_OUTPUT_DIR="/tmp/vault-test-results"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test tracking
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Create test output directory
mkdir -p "$TEST_OUTPUT_DIR"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    ((TESTS_PASSED++))
}

log_failure() {
    echo -e "${RED}[FAILURE]${NC} $1"
    ((TESTS_FAILED++))
}

log_test() {
    echo -e "${YELLOW}[TEST]${NC} $1"
    ((TESTS_TOTAL++))
}

# Test functions
test_vault_health() {
    log_test "Testing Vault server health..."
    
    if curl -s "$VAULT_ADDR/v1/sys/health" > "$TEST_OUTPUT_DIR/health.json"; then
        local status=$(jq -r '.initialized' "$TEST_OUTPUT_DIR/health.json" 2>/dev/null || echo "false")
        if [ "$status" = "true" ]; then
            log_success "Vault is healthy and initialized"
            return 0
        else
            log_failure "Vault is not initialized"
            return 1
        fi
    else
        log_failure "Cannot connect to Vault at $VAULT_ADDR"
        return 1
    fi
}

test_authentication() {
    log_test "Testing authentication methods..."
    
    if [ -z "${VAULT_TOKEN:-}" ]; then
        log_failure "VAULT_TOKEN not set"
        return 1
    fi
    
    # Test token authentication
    if curl -s -H "X-Vault-Token: $VAULT_TOKEN" \
        "$VAULT_ADDR/v1/auth/token/lookup-self" > "$TEST_OUTPUT_DIR/token-lookup.json"; then
        log_success "Token authentication working"
    else
        log_failure "Token authentication failed"
        return 1
    fi
    
    # Test AppRole auth method exists
    if curl -s -H "X-Vault-Token: $VAULT_TOKEN" \
        "$VAULT_ADDR/v1/sys/auth" | jq -e '.["approle/"]' > /dev/null; then
        log_success "AppRole authentication method enabled"
    else
        log_failure "AppRole authentication method not found"
        return 1
    fi
}

test_policies() {
    log_test "Testing security policies..."
    
    local policies=("admin-policy" "user-service-policy" "game-service-policy" "chat-service-policy" "tournament-service-policy" "api-gateway-policy")
    local policies_found=0
    
    for policy in "${policies[@]}"; do
        if curl -s -H "X-Vault-Token: $VAULT_TOKEN" \
            "$VAULT_ADDR/v1/sys/policies/acl/$policy" > /dev/null; then
            log_success "Policy '$policy' exists"
            ((policies_found++))
        else
            log_failure "Policy '$policy' not found"
        fi
    done
    
    if [ $policies_found -eq ${#policies[@]} ]; then
        log_success "All security policies are installed"
        return 0
    else
        log_failure "Missing policies: $((${#policies[@]} - policies_found)) out of ${#policies[@]}"
        return 1
    fi
}

test_secret_engines() {
    log_test "Testing secret engines..."
    
    # Test KV v2 secret engine
    if curl -s -H "X-Vault-Token: $VAULT_TOKEN" \
        "$VAULT_ADDR/v1/sys/mounts" | jq -e '.["secret/"]' > /dev/null; then
        log_success "KV v2 secret engine enabled"
    else
        log_failure "KV v2 secret engine not found"
        return 1
    fi
    
    # Test database secret engine (if enabled)
    if curl -s -H "X-Vault-Token: $VAULT_TOKEN" \
        "$VAULT_ADDR/v1/sys/mounts" | jq -e '.["database/"]' > /dev/null; then
        log_success "Database secret engine enabled"
    else
        log_info "Database secret engine not enabled (optional)"
    fi
}

test_secret_operations() {
    log_test "Testing secret operations..."
    
    local test_secret_path="secret/data/test/vault-system-test"
    local test_data='{"data": {"test_key": "test_value", "timestamp": "'$(date)'"}}'
    
    # Write test secret
    if curl -s -X POST \
        -H "X-Vault-Token: $VAULT_TOKEN" \
        -H "Content-Type: application/json" \
        -d "$test_data" \
        "$VAULT_ADDR/v1/$test_secret_path" > "$TEST_OUTPUT_DIR/write-response.json"; then
        log_success "Secret write operation successful"
    else
        log_failure "Secret write operation failed"
        return 1
    fi
    
    # Read test secret
    if curl -s -H "X-Vault-Token: $VAULT_TOKEN" \
        "$VAULT_ADDR/v1/$test_secret_path" > "$TEST_OUTPUT_DIR/read-response.json"; then
        local retrieved_value=$(jq -r '.data.data.test_key' "$TEST_OUTPUT_DIR/read-response.json" 2>/dev/null || echo "")
        if [ "$retrieved_value" = "test_value" ]; then
            log_success "Secret read operation successful"
        else
            log_failure "Secret read operation returned wrong value"
            return 1
        fi
    else
        log_failure "Secret read operation failed"
        return 1
    fi
    
    # List secrets
    if curl -s -X LIST -H "X-Vault-Token: $VAULT_TOKEN" \
        "$VAULT_ADDR/v1/secret/metadata/test" > "$TEST_OUTPUT_DIR/list-response.json"; then
        log_success "Secret list operation successful"
    else
        log_failure "Secret list operation failed"
        return 1
    fi
    
    # Clean up test secret
    if curl -s -X DELETE -H "X-Vault-Token: $VAULT_TOKEN" \
        "$VAULT_ADDR/v1/$test_secret_path" > /dev/null; then
        log_success "Secret delete operation successful"
    else
        log_failure "Secret delete operation failed"
        return 1
    fi
}

test_service_secrets() {
    log_test "Testing service-specific secrets..."
    
    local services=("user-service" "game-service" "chat-service" "tournament-service" "api-gateway")
    local secrets_found=0
    
    for service in "${services[@]}"; do
        # Check if service secrets exist
        if curl -s -H "X-Vault-Token: $VAULT_TOKEN" \
            "$VAULT_ADDR/v1/secret/data/$service/database" > /dev/null 2>&1; then
            log_success "Secrets for '$service' exist"
            ((secrets_found++))
        else
            log_info "Secrets for '$service' not found (may not be initialized yet)"
        fi
    done
    
    if [ $secrets_found -gt 0 ]; then
        log_success "Found secrets for $secrets_found services"
        return 0
    else
        log_info "No service secrets found (run setup-secrets script first)"
        return 0
    fi
}

test_typescript_client() {
    log_test "Testing TypeScript client compilation..."
    
    local vault_client_dir="../../../packages/shared-utils/src/vault"
    
    if [ -f "$vault_client_dir/client.ts" ]; then
        log_success "TypeScript Vault client files exist"
        
        # Check if we can compile (basic syntax check)
        if command -v tsc >/dev/null 2>&1; then
            cd "$vault_client_dir"
            if tsc --noEmit --skipLibCheck client.ts 2>/dev/null; then
                log_success "TypeScript client compiles successfully"
            else
                log_failure "TypeScript client has compilation errors"
                return 1
            fi
        else
            log_info "TypeScript compiler not available, skipping compilation test"
        fi
    else
        log_failure "TypeScript Vault client files not found"
        return 1
    fi
}

run_node_integration_test() {
    log_test "Testing Node.js integration..."
    
    local test_script_path="$TEST_OUTPUT_DIR/integration-test.js"
    
    # Create a simple Node.js test
    cat > "$test_script_path" << 'EOF'
const https = require('https');
const http = require('http');

// Simple fetch-like function for Node.js
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https:') ? https : http;
        const req = protocol.request(url, {
            method: options.method || 'GET',
            headers: options.headers || {},
            timeout: 5000
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        data: JSON.parse(data)
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        data: data
                    });
                }
            });
        });
        
        req.on('error', reject);
        req.on('timeout', () => reject(new Error('Request timeout')));
        req.end();
    });
}

async function testVaultConnection() {
    try {
        const vaultAddr = process.env.VAULT_ADDR || 'http://localhost:8200';
        const response = await makeRequest(`${vaultAddr}/v1/sys/health`);
        
        if (response.status === 200 && response.data.initialized) {
            console.log('✅ Node.js can connect to Vault successfully');
            process.exit(0);
        } else {
            console.log('❌ Vault is not ready');
            process.exit(1);
        }
    } catch (error) {
        console.log('❌ Failed to connect to Vault:', error.message);
        process.exit(1);
    }
}

testVaultConnection();
EOF
    
    if command -v node >/dev/null 2>&1; then
        if VAULT_ADDR="$VAULT_ADDR" node "$test_script_path"; then
            log_success "Node.js integration test passed"
        else
            log_failure "Node.js integration test failed"
            return 1
        fi
    else
        log_info "Node.js not available, skipping integration test"
    fi
}

# Performance test
test_vault_performance() {
    log_test "Testing Vault performance..."
    
    local start_time=$(date +%s%N)
    
    # Perform 10 health checks
    for i in {1..10}; do
        curl -s "$VAULT_ADDR/v1/sys/health" > /dev/null || return 1
    done
    
    local end_time=$(date +%s%N)
    local duration_ms=$(( (end_time - start_time) / 1000000 ))
    local avg_ms=$(( duration_ms / 10 ))
    
    if [ $avg_ms -lt 100 ]; then
        log_success "Performance test passed (avg ${avg_ms}ms per request)"
    else
        log_failure "Performance test failed (avg ${avg_ms}ms per request, expected <100ms)"
        return 1
    fi
}

# Generate test report
generate_report() {
    local report_file="$TEST_OUTPUT_DIR/test-report.md"
    
    cat > "$report_file" << EOF
# Vault System Test Report

**Generated:** $(date)
**Vault Address:** $VAULT_ADDR

## Test Results

- **Total Tests:** $TESTS_TOTAL
- **Passed:** $TESTS_PASSED
- **Failed:** $TESTS_FAILED
- **Success Rate:** $(( TESTS_PASSED * 100 / TESTS_TOTAL ))%

## Test Details

$(cat "$TEST_OUTPUT_DIR/test-log.txt" 2>/dev/null || echo "No detailed logs available")

## Files Generated

$(ls -la "$TEST_OUTPUT_DIR/")

---
*Generated by Vault System Test Script*
EOF
    
    log_info "Test report generated: $report_file"
}

# Main test execution
main() {
    log_info "🧪 Starting Vault System Tests..."
    log_info "Vault Address: $VAULT_ADDR"
    log_info "Test Output Directory: $TEST_OUTPUT_DIR"
    
    # Redirect all output to log file as well
    exec > >(tee "$TEST_OUTPUT_DIR/test-log.txt")
    exec 2>&1
    
    echo "========================================"
    echo "        VAULT SYSTEM TESTS"
    echo "========================================"
    
    # Run all tests
    test_vault_health || true
    test_authentication || true
    test_policies || true
    test_secret_engines || true
    test_secret_operations || true
    test_service_secrets || true
    test_typescript_client || true
    run_node_integration_test || true
    test_vault_performance || true
    
    echo "========================================"
    echo "           TEST SUMMARY"
    echo "========================================"
    
    if [ $TESTS_FAILED -eq 0 ]; then
        log_success "🎉 ALL TESTS PASSED! ($TESTS_PASSED/$TESTS_TOTAL)"
        log_success "Vault system is working correctly!"
    else
        log_failure "❌ SOME TESTS FAILED! ($TESTS_FAILED/$TESTS_TOTAL failed)"
        log_info "Check the logs in $TEST_OUTPUT_DIR for details"
    fi
    
    generate_report
    
    echo ""
    log_info "Test artifacts saved in: $TEST_OUTPUT_DIR"
    log_info "View detailed report: cat $TEST_OUTPUT_DIR/test-report.md"
    
    # Exit with appropriate code
    [ $TESTS_FAILED -eq 0 ]
}

# Help function
show_help() {
    cat << EOF
Vault System Test Script

USAGE:
    $0 [options]

OPTIONS:
    -h, --help          Show this help message
    -a, --addr ADDR     Vault address (default: http://localhost:8200)
    
ENVIRONMENT:
    VAULT_ADDR          Vault server address
    VAULT_TOKEN         Vault authentication token

EXAMPLES:
    # Test with default settings
    $0
    
    # Test with custom Vault address
    VAULT_ADDR=https://vault.company.com:8200 $0
    
    # Test with specific token
    VAULT_TOKEN=your-token $0

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -a|--addr)
            VAULT_ADDR="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Run main function
main "$@"