#!/bin/bash
# =======================================================================
# Quick Vault Test Setup
# =======================================================================
# This script sets up Vault for testing and runs comprehensive tests
# =======================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Vault is running
check_vault_running() {
    if curl -s http://localhost:8200/v1/sys/health >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Start Vault in development mode
start_vault_dev() {
    log_info "Starting Vault in development mode..."
    
    # Kill any existing Vault process
    pkill vault || true
    sleep 2
    
    # Start Vault in dev mode
    nohup vault server -dev \
        -dev-root-token-id="dev-root-token-123" \
        -dev-listen-address="0.0.0.0:8200" \
        > /tmp/vault-dev.log 2>&1 &
    
    echo $! > /tmp/vault-dev.pid
    
    # Wait for Vault to start
    local attempts=0
    while [ $attempts -lt 30 ]; do
        if check_vault_running; then
            log_success "Vault is running on http://localhost:8200"
            return 0
        fi
        sleep 1
        ((attempts++))
    done
    
    log_error "Failed to start Vault"
    return 1
}

# Initialize Vault with our setup
initialize_vault() {
    log_info "Initializing Vault with policies and secrets..."
    
    export VAULT_ADDR="http://localhost:8200"
    export VAULT_TOKEN="dev-root-token-123"
    
    # Run our initialization script
    if [ -f "$SCRIPT_DIR/init-vault.sh" ]; then
        "$SCRIPT_DIR/init-vault.sh" dev
    else
        log_warning "init-vault.sh not found, skipping initialization"
    fi
}

# Run comprehensive tests
run_tests() {
    log_info "Running comprehensive Vault tests..."
    
    export VAULT_ADDR="http://localhost:8200"
    export VAULT_TOKEN="dev-root-token-123"
    
    if [ -f "$SCRIPT_DIR/test-vault-system.sh" ]; then
        "$SCRIPT_DIR/test-vault-system.sh"
    else
        log_error "test-vault-system.sh not found"
        return 1
    fi
}

# Cleanup function
cleanup() {
    log_info "Cleaning up..."
    if [ -f /tmp/vault-dev.pid ]; then
        local pid=$(cat /tmp/vault-dev.pid)
        kill $pid 2>/dev/null || true
        rm -f /tmp/vault-dev.pid
    fi
    pkill vault || true
}

# Help function
show_help() {
    cat << EOF
Quick Vault Test Setup

This script will:
1. Start Vault in development mode
2. Initialize it with policies and secrets
3. Run comprehensive tests
4. Generate a test report

USAGE:
    $0 [options]

OPTIONS:
    -h, --help          Show this help message
    -s, --setup-only    Only setup Vault, don't run tests
    -t, --test-only     Only run tests (assumes Vault is running)
    -c, --cleanup       Stop Vault and cleanup

EXAMPLES:
    # Full setup and test
    $0
    
    # Setup only
    $0 --setup-only
    
    # Test only (Vault already running)
    $0 --test-only
    
    # Cleanup
    $0 --cleanup

EOF
}

# Main function
main() {
    local setup_only=false
    local test_only=false
    local cleanup_only=false
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -s|--setup-only)
                setup_only=true
                shift
                ;;
            -t|--test-only)
                test_only=true
                shift
                ;;
            -c|--cleanup)
                cleanup_only=true
                shift
                ;;
            *)
                echo "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Cleanup and exit if requested
    if [ "$cleanup_only" = true ]; then
        cleanup
        log_success "Cleanup completed"
        exit 0
    fi
    
    echo "========================================"
    echo "     VAULT TESTING SETUP"
    echo "========================================"
    
    # Setup trap for cleanup on exit
    trap cleanup EXIT
    
    if [ "$test_only" = false ]; then
        # Check if Vault is already running
        if check_vault_running; then
            log_warning "Vault is already running at http://localhost:8200"
            log_info "Use --cleanup to stop it first, or --test-only to just run tests"
        else
            # Start Vault
            start_vault_dev || exit 1
            
            # Initialize Vault
            sleep 3
            initialize_vault || true  # Don't fail if init has issues
        fi
    fi
    
    if [ "$setup_only" = false ]; then
        # Run tests
        echo ""
        echo "========================================"
        echo "        RUNNING TESTS"
        echo "========================================"
        
        if run_tests; then
            log_success "🎉 All tests completed successfully!"
        else
            log_error "❌ Some tests failed. Check the output above."
        fi
    else
        log_success "Setup completed. Vault is running at http://localhost:8200"
        log_info "Use the following to test manually:"
        log_info "  export VAULT_ADDR=http://localhost:8200"
        log_info "  export VAULT_TOKEN=dev-root-token-123"
        log_info "  vault status"
    fi
    
    echo ""
    log_info "Vault is running at: http://localhost:8200"
    log_info "UI available at: http://localhost:8200/ui"
    log_info "Root token: dev-root-token-123"
    log_info ""
    log_info "To stop Vault: $0 --cleanup"
}

# Check dependencies
check_dependencies() {
    local missing_deps=()
    
    if ! command -v vault >/dev/null 2>&1; then
        missing_deps+=("vault")
    fi
    
    if ! command -v curl >/dev/null 2>&1; then
        missing_deps+=("curl")
    fi
    
    if ! command -v jq >/dev/null 2>&1; then
        missing_deps+=("jq")
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        log_error "Missing dependencies: ${missing_deps[*]}"
        log_info "Please install the missing tools and try again"
        exit 1
    fi
}

# Check dependencies and run main
check_dependencies
main "$@"