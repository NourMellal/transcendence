#!/bin/bash
# =======================================================================
# Vault Initialization Script for Transcendence Microservices
# =======================================================================
# This script initializes Vault with all necessary configurations for
# the Transcendence project including policies, secrets, and auth methods
#
# Usage:
#   ./init-vault.sh [environment]
#   
# Environments: dev, staging, prod
# Default: dev
#
# Prerequisites:
#   - Vault server running and accessible
#   - curl and jq installed
#   - Proper network access to Vault
# =======================================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENVIRONMENT="${1:-dev}"
VAULT_ADDR="${VAULT_ADDR:-http://localhost:8200}"
VAULT_INIT_FILE="/tmp/vault-init-${ENVIRONMENT}.json"
POLICIES_DIR="${SCRIPT_DIR}/../policies"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
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

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if curl is available
    if ! command -v curl &> /dev/null; then
        log_error "curl is required but not installed"
        exit 1
    fi
    
    # Check if jq is available
    if ! command -v jq &> /dev/null; then
        log_error "jq is required but not installed"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Wait for Vault to be ready
wait_for_vault() {
    log_info "Waiting for Vault to be ready at $VAULT_ADDR..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$VAULT_ADDR/v1/sys/health" > /dev/null 2>&1; then
            log_success "Vault is ready!"
            return 0
        fi
        
        log_info "Attempt $attempt/$max_attempts - Vault not ready, waiting 5 seconds..."
        sleep 5
        ((attempt++))
    done
    
    log_error "Vault did not become ready after $max_attempts attempts"
    exit 1
}

# Initialize Vault
initialize_vault() {
    log_info "Checking Vault initialization status..."
    
    local init_status
    init_status=$(curl -s "$VAULT_ADDR/v1/sys/init" | jq -r '.initialized')
    
    if [ "$init_status" = "true" ]; then
        log_info "Vault is already initialized"
        
        if [ -f "$VAULT_INIT_FILE" ]; then
            log_info "Loading existing initialization data"
            export VAULT_TOKEN=$(jq -r '.root_token' "$VAULT_INIT_FILE")
        else
            log_warning "Vault is initialized but init file is missing"
            log_warning "Please provide VAULT_TOKEN environment variable"
            if [ -z "${VAULT_TOKEN:-}" ]; then
                log_error "VAULT_TOKEN is required for initialized Vault"
                exit 1
            fi
        fi
    else
        log_info "Initializing Vault..."
        
        # Different initialization based on environment
        local shares threshold
        case $ENVIRONMENT in
            dev)
                shares=1
                threshold=1
                ;;
            staging)
                shares=3
                threshold=2
                ;;
            prod)
                shares=5
                threshold=3
                ;;
            *)
                log_error "Unknown environment: $ENVIRONMENT"
                exit 1
                ;;
        esac
        
        local init_response
        init_response=$(curl -s -X POST "$VAULT_ADDR/v1/sys/init" \
            -d "{\"secret_shares\": $shares, \"secret_threshold\": $threshold}")
        
        if echo "$init_response" | jq -e '.errors' > /dev/null; then
            log_error "Failed to initialize Vault:"
            echo "$init_response" | jq -r '.errors[]'
            exit 1
        fi
        
        # Save initialization data
        echo "$init_response" | jq . > "$VAULT_INIT_FILE"
        chmod 600 "$VAULT_INIT_FILE"
        
        log_success "Vault initialized successfully"
        log_warning "IMPORTANT: Save the unseal keys and root token securely!"
        log_info "Initialization data saved to: $VAULT_INIT_FILE"
        
        # Extract root token
        export VAULT_TOKEN=$(echo "$init_response" | jq -r '.root_token')
        
        # Unseal Vault
        unseal_vault "$init_response" $threshold
    fi
}

# Unseal Vault
unseal_vault() {
    local init_data="$1"
    local threshold="$2"
    
    log_info "Unsealing Vault..."
    
    for ((i=0; i<threshold; i++)); do
        local unseal_key
        unseal_key=$(echo "$init_data" | jq -r ".keys[$i]")
        
        curl -s -X POST "$VAULT_ADDR/v1/sys/unseal" \
            -d "{\"key\": \"$unseal_key\"}" > /dev/null
        
        log_info "Applied unseal key $((i+1))/$threshold"
    done
    
    log_success "Vault unsealed successfully"
}

# Enable secrets engines
enable_secrets_engines() {
    log_info "Enabling secrets engines..."
    
    # Enable KV v2 secrets engine
    log_info "Enabling KV v2 secrets engine..."
    curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
        "$VAULT_ADDR/v1/sys/mounts/secret" \
        -d '{"type": "kv", "options": {"version": "2"}}' > /dev/null 2>&1 || \
        log_info "KV engine may already be enabled"
    
    # Enable database secrets engine for dynamic credentials
    log_info "Enabling database secrets engine..."
    curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
        "$VAULT_ADDR/v1/sys/mounts/database" \
        -d '{"type": "database"}' > /dev/null 2>&1 || \
        log_info "Database engine may already be enabled"
    
    # Enable PKI engine for certificates
    log_info "Enabling PKI secrets engine..."
    curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
        "$VAULT_ADDR/v1/sys/mounts/pki" \
        -d '{"type": "pki"}' > /dev/null 2>&1 || \
        log_info "PKI engine may already be enabled"
    
    log_success "Secrets engines enabled"
}

# Create policies
create_policies() {
    log_info "Creating Vault policies..."
    
    if [ ! -d "$POLICIES_DIR" ]; then
        log_error "Policies directory not found: $POLICIES_DIR"
        exit 1
    fi
    
    for policy_file in "$POLICIES_DIR"/*.hcl; do
        if [ -f "$policy_file" ]; then
            local policy_name
            policy_name=$(basename "$policy_file" .hcl)
            
            log_info "Creating policy: $policy_name"
            
            # Read policy content and escape for JSON
            local policy_content
            policy_content=$(cat "$policy_file" | sed 's/"/\\"/g' | tr '\n' ' ')
            
            curl -s -X PUT -H "X-Vault-Token: $VAULT_TOKEN" \
                "$VAULT_ADDR/v1/sys/policies/acl/$policy_name" \
                -d "{\"policy\": \"$policy_content\"}" > /dev/null
            
            log_success "Policy created: $policy_name"
        fi
    done
}

# Enable authentication methods
enable_auth_methods() {
    log_info "Enabling authentication methods..."
    
    # Enable AppRole authentication
    log_info "Enabling AppRole authentication..."
    curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
        "$VAULT_ADDR/v1/sys/auth/approle" \
        -d '{"type": "approle"}' > /dev/null 2>&1 || \
        log_info "AppRole may already be enabled"
    
    # Enable JWT authentication for future use
    log_info "Enabling JWT authentication..."
    curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
        "$VAULT_ADDR/v1/sys/auth/jwt" \
        -d '{"type": "jwt"}' > /dev/null 2>&1 || \
        log_info "JWT auth may already be enabled"
    
    log_success "Authentication methods enabled"
}

# Create service roles
create_service_roles() {
    log_info "Creating service roles..."
    
    local services=("user-service" "game-service" "chat-service" "tournament-service" "api-gateway")
    
    # Create service credentials directory
    local creds_dir="/tmp/vault-service-credentials-$ENVIRONMENT"
    mkdir -p "$creds_dir"
    chmod 700 "$creds_dir"
    
    for service in "${services[@]}"; do
        log_info "Creating role for: $service"
        
        # Create AppRole role
        curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
            "$VAULT_ADDR/v1/auth/approle/role/$service" \
            -d "{
                \"policies\": [\"${service}-policy\"],
                \"token_ttl\": \"1h\",
                \"token_max_ttl\": \"4h\",
                \"bind_secret_id\": true,
                \"secret_id_ttl\": \"24h\"
            }" > /dev/null
        
        # Get role ID
        local role_id
        role_id=$(curl -s -H "X-Vault-Token: $VAULT_TOKEN" \
            "$VAULT_ADDR/v1/auth/approle/role/$service/role-id" | jq -r '.data.role_id')
        
        # Generate secret ID
        local secret_id
        secret_id=$(curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
            "$VAULT_ADDR/v1/auth/approle/role/$service/secret-id" | jq -r '.data.secret_id')
        
        # Save credentials
        local creds_file="$creds_dir/$service.json"
        echo "{\"role_id\": \"$role_id\", \"secret_id\": \"$secret_id\"}" > "$creds_file"
        chmod 600 "$creds_file"
        
        log_success "Created role and credentials for: $service"
    done
    
    log_info "Service credentials saved to: $creds_dir"
}

# Setup initial secrets
setup_initial_secrets() {
    log_info "Setting up initial secrets for environment: $ENVIRONMENT"
    
    # Call environment-specific setup script
    local setup_script="${SCRIPT_DIR}/setup-secrets-${ENVIRONMENT}.sh"
    
    if [ -f "$setup_script" ]; then
        log_info "Running environment-specific secret setup..."
        bash "$setup_script"
    else
        log_warning "No environment-specific setup script found: $setup_script"
        log_info "Running default secret setup..."
        bash "${SCRIPT_DIR}/setup-secrets-default.sh"
    fi
}

# Main execution
main() {
    echo "========================================"
    echo "🔐 Vault Initialization for Transcendence"
    echo "========================================"
    echo "Environment: $ENVIRONMENT"
    echo "Vault Address: $VAULT_ADDR"
    echo "========================================"
    echo
    
    check_prerequisites
    wait_for_vault
    initialize_vault
    enable_secrets_engines
    create_policies
    enable_auth_methods
    create_service_roles
    setup_initial_secrets
    
    echo
    log_success "🎉 Vault initialization completed successfully!"
    echo
    echo "📋 Summary:"
    echo "   ✅ Vault initialized and unsealed"
    echo "   ✅ Secrets engines enabled (KV v2, Database, PKI)"
    echo "   ✅ Service policies created"
    echo "   ✅ Authentication methods enabled (AppRole, JWT)"
    echo "   ✅ Service roles and credentials generated"
    echo "   ✅ Initial secrets populated"
    echo
    echo "🔑 Next steps:"
    echo "   1. Distribute service credentials to applications"
    echo "   2. Update service configurations to use Vault"
    echo "   3. Test secret access from each service"
    echo "   4. Set up secret rotation schedules"
    echo
    echo "🌐 Vault UI: $VAULT_ADDR/ui"
    echo "🔑 Root Token: $([ -f "$VAULT_INIT_FILE" ] && jq -r '.root_token' "$VAULT_INIT_FILE" || echo "Check VAULT_TOKEN variable")"
    echo
    echo "⚠️  Security Reminders:"
    echo "   - Secure the root token and unseal keys"
    echo "   - Rotate the root token after setup"
    echo "   - Enable audit logging"
    echo "   - Monitor Vault access logs"
    echo "   - Set up regular backups"
}

# Execute main function
main "$@"