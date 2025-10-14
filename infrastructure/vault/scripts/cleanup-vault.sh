#!/bin/bash
# =======================================================================
# Vault Cleanup and Reset Script
# =======================================================================
# This script safely cleans up Vault data and configurations
# Use with EXTREME CAUTION - this will remove all secrets and configurations
#
# Usage: ./cleanup-vault.sh [environment] [--force]
# Environments: dev, staging, prod
# Use --force to skip confirmation prompts
# =======================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENVIRONMENT="${1:-dev}"
FORCE_MODE="${2:-}"
VAULT_ADDR="${VAULT_ADDR:-http://localhost:8200}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
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

log_section() {
    echo -e "${PURPLE}[SECTION]${NC} $1"
    echo "=========================================="
}

# Safety confirmation
confirm_action() {
    local action="$1"
    local danger_level="${2:-medium}"
    
    if [ "$FORCE_MODE" = "--force" ]; then
        log_warning "Force mode enabled - skipping confirmation for: $action"
        return 0
    fi
    
    echo
    if [ "$danger_level" = "high" ]; then
        echo -e "${RED}⚠️  DANGER: This action is irreversible!${NC}"
        echo -e "${RED}⚠️  Action: $action${NC}"
        echo -e "${RED}⚠️  Environment: $ENVIRONMENT${NC}"
        echo -e "${RED}⚠️  Vault: $VAULT_ADDR${NC}"
        echo
        read -p "Type 'DELETE' to confirm this dangerous action: " confirmation
        [ "$confirmation" = "DELETE" ]
    else
        echo -e "${YELLOW}⚠️  Action: $action${NC}"
        echo -e "${YELLOW}⚠️  Environment: $ENVIRONMENT${NC}"
        echo
        read -p "Are you sure? (yes/no): " confirmation
        [ "$confirmation" = "yes" ]
    fi
}

# Check if Vault is accessible
check_vault_accessible() {
    log_info "Checking Vault accessibility..."
    
    if ! curl -s "$VAULT_ADDR/v1/sys/health" > /dev/null 2>&1; then
        log_error "Vault is not accessible at $VAULT_ADDR"
        exit 1
    fi
    
    log_success "Vault is accessible"
}

# Check authentication
check_vault_auth() {
    if [ -z "${VAULT_TOKEN:-}" ]; then
        log_error "VAULT_TOKEN environment variable is required"
        exit 1
    fi
    
    log_info "Checking Vault authentication..."
    
    local response
    response=$(curl -s -H "X-Vault-Token: $VAULT_TOKEN" \
               "$VAULT_ADDR/v1/auth/token/lookup-self" 2>/dev/null)
    
    if echo "$response" | grep -q '"errors"'; then
        log_error "Invalid or expired Vault token"
        exit 1
    fi
    
    log_success "Vault authentication verified"
}

# Remove all secrets
cleanup_secrets() {
    log_section "Cleaning up secrets"
    
    if ! confirm_action "Remove all secrets from Vault" "high"; then
        log_info "Skipping secret cleanup"
        return
    fi
    
    log_info "Removing secrets..."
    
    # Get list of secret paths
    local secret_paths
    secret_paths=$(curl -s -H "X-Vault-Token: $VAULT_TOKEN" \
                   "$VAULT_ADDR/v1/secret/metadata?list=true" 2>/dev/null | \
                   jq -r '.data.keys[]? // empty' 2>/dev/null || true)
    
    if [ -n "$secret_paths" ]; then
        while IFS= read -r path; do
            if [ -n "$path" ]; then
                log_info "Removing secret: $path"
                curl -s -X DELETE -H "X-Vault-Token: $VAULT_TOKEN" \
                     "$VAULT_ADDR/v1/secret/metadata/$path" > /dev/null 2>&1 || \
                     log_warning "Failed to remove secret: $path"
            fi
        done <<< "$secret_paths"
        
        log_success "Secrets removed"
    else
        log_info "No secrets found to remove"
    fi
}

# Remove policies
cleanup_policies() {
    log_section "Cleaning up policies"
    
    if ! confirm_action "Remove all custom policies" "medium"; then
        log_info "Skipping policy cleanup"
        return
    fi
    
    log_info "Removing policies..."
    
    local policies=("user-service-policy" "game-service-policy" "chat-service-policy" 
                   "tournament-service-policy" "api-gateway-policy" "admin-policy" "developer-policy")
    
    for policy in "${policies[@]}"; do
        log_info "Removing policy: $policy"
        curl -s -X DELETE -H "X-Vault-Token: $VAULT_TOKEN" \
             "$VAULT_ADDR/v1/sys/policies/acl/$policy" > /dev/null 2>&1 || \
             log_warning "Failed to remove policy: $policy"
    done
    
    log_success "Policies removed"
}

# Remove AppRole configurations
cleanup_approles() {
    log_section "Cleaning up AppRoles"
    
    if ! confirm_action "Remove all AppRole configurations" "medium"; then
        log_info "Skipping AppRole cleanup"
        return
    fi
    
    log_info "Removing AppRoles..."
    
    local services=("user-service" "game-service" "chat-service" "tournament-service" "api-gateway")
    
    for service in "${services[@]}"; do
        log_info "Removing AppRole: $service"
        curl -s -X DELETE -H "X-Vault-Token: $VAULT_TOKEN" \
             "$VAULT_ADDR/v1/auth/approle/role/$service" > /dev/null 2>&1 || \
             log_warning "Failed to remove AppRole: $service"
    done
    
    log_success "AppRoles removed"
}

# Disable auth methods
cleanup_auth_methods() {
    log_section "Cleaning up authentication methods"
    
    if ! confirm_action "Disable custom authentication methods" "medium"; then
        log_info "Skipping auth method cleanup"
        return
    fi
    
    log_info "Disabling authentication methods..."
    
    # Disable AppRole
    log_info "Disabling AppRole authentication..."
    curl -s -X DELETE -H "X-Vault-Token: $VAULT_TOKEN" \
         "$VAULT_ADDR/v1/sys/auth/approle" > /dev/null 2>&1 || \
         log_warning "Failed to disable AppRole authentication"
    
    # Disable JWT
    log_info "Disabling JWT authentication..."
    curl -s -X DELETE -H "X-Vault-Token: $VAULT_TOKEN" \
         "$VAULT_ADDR/v1/sys/auth/jwt" > /dev/null 2>&1 || \
         log_warning "Failed to disable JWT authentication"
    
    log_success "Authentication methods disabled"
}

# Disable secrets engines
cleanup_secrets_engines() {
    log_section "Cleaning up secrets engines"
    
    if ! confirm_action "Disable custom secrets engines" "medium"; then
        log_info "Skipping secrets engine cleanup"
        return
    fi
    
    log_info "Disabling secrets engines..."
    
    # Disable database engine
    log_info "Disabling database secrets engine..."
    curl -s -X DELETE -H "X-Vault-Token: $VAULT_TOKEN" \
         "$VAULT_ADDR/v1/sys/mounts/database" > /dev/null 2>&1 || \
         log_warning "Failed to disable database secrets engine"
    
    # Disable PKI engine
    log_info "Disabling PKI secrets engine..."
    curl -s -X DELETE -H "X-Vault-Token: $VAULT_TOKEN" \
         "$VAULT_ADDR/v1/sys/mounts/pki" > /dev/null 2>&1 || \
         log_warning "Failed to disable PKI secrets engine"
    
    log_success "Secrets engines disabled"
}

# Remove temporary files
cleanup_temp_files() {
    log_section "Cleaning up temporary files"
    
    log_info "Removing temporary files..."
    
    # Remove initialization files
    rm -f "/tmp/vault-init-${ENVIRONMENT}.json" 2>/dev/null || true
    rm -rf "/tmp/vault-service-credentials-${ENVIRONMENT}" 2>/dev/null || true
    
    # Remove any backup files
    find /tmp -name "*vault*" -name "*${ENVIRONMENT}*" -type f -mtime +1 -delete 2>/dev/null || true
    
    log_success "Temporary files cleaned"
}

# Stop and remove Docker containers (if applicable)
cleanup_docker() {
    log_section "Docker cleanup"
    
    if ! command -v docker >/dev/null 2>&1; then
        log_info "Docker not available - skipping container cleanup"
        return
    fi
    
    if ! confirm_action "Stop and remove Vault Docker containers" "medium"; then
        log_info "Skipping Docker cleanup"
        return
    fi
    
    log_info "Stopping Vault containers..."
    
    # Stop vault containers
    docker ps -q --filter "name=vault" | xargs -r docker stop 2>/dev/null || true
    
    log_info "Removing Vault containers..."
    docker ps -aq --filter "name=vault" | xargs -r docker rm 2>/dev/null || true
    
    # Remove vault volumes if they exist
    log_info "Removing Vault volumes..."
    docker volume ls -q --filter "name=vault" | xargs -r docker volume rm 2>/dev/null || true
    
    log_success "Docker cleanup completed"
}

# Reset Vault (complete reinstall)
reset_vault() {
    log_section "Complete Vault Reset"
    
    if ! confirm_action "COMPLETELY RESET Vault (removes ALL data)" "high"; then
        log_info "Skipping complete reset"
        return
    fi
    
    log_warning "This will completely reset Vault - all data will be lost!"
    
    # Stop vault if running in Docker
    cleanup_docker
    
    # Clean up all vault data
    cleanup_secrets
    cleanup_policies
    cleanup_approles
    cleanup_auth_methods
    cleanup_secrets_engines
    cleanup_temp_files
    
    log_success "Vault has been completely reset"
    log_info "To reinitialize, run: ./init-vault.sh $ENVIRONMENT"
}

# Backup before cleanup (safety measure)
backup_vault() {
    log_section "Creating backup"
    
    log_info "Creating backup before cleanup..."
    
    local backup_dir="/tmp/vault-backup-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$backup_dir"
    
    # Backup secrets
    log_info "Backing up secrets..."
    curl -s -H "X-Vault-Token: $VAULT_TOKEN" \
         "$VAULT_ADDR/v1/secret/metadata?list=true" > "$backup_dir/secrets-list.json" 2>/dev/null || true
    
    # Backup policies
    log_info "Backing up policies..."
    curl -s -H "X-Vault-Token: $VAULT_TOKEN" \
         "$VAULT_ADDR/v1/sys/policies/acl" > "$backup_dir/policies.json" 2>/dev/null || true
    
    # Backup auth methods
    log_info "Backing up auth methods..."
    curl -s -H "X-Vault-Token: $VAULT_TOKEN" \
         "$VAULT_ADDR/v1/sys/auth" > "$backup_dir/auth-methods.json" 2>/dev/null || true
    
    # Backup mounts
    log_info "Backing up secrets engines..."
    curl -s -H "X-Vault-Token: $VAULT_TOKEN" \
         "$VAULT_ADDR/v1/sys/mounts" > "$backup_dir/mounts.json" 2>/dev/null || true
    
    log_success "Backup created at: $backup_dir"
    echo "Backup location: $backup_dir"
}

# Show cleanup menu
show_menu() {
    echo
    echo "Vault Cleanup Options:"
    echo "1) Clean secrets only"
    echo "2) Clean policies only"
    echo "3) Clean AppRoles only"
    echo "4) Clean auth methods"
    echo "5) Clean secrets engines"
    echo "6) Clean temporary files"
    echo "7) Clean Docker containers"
    echo "8) Complete reset (ALL data)"
    echo "9) Create backup only"
    echo "0) Exit"
    echo
    read -p "Choose an option (0-9): " choice
    
    case $choice in
        1) backup_vault && cleanup_secrets ;;
        2) backup_vault && cleanup_policies ;;
        3) backup_vault && cleanup_approles ;;
        4) backup_vault && cleanup_auth_methods ;;
        5) backup_vault && cleanup_secrets_engines ;;
        6) cleanup_temp_files ;;
        7) cleanup_docker ;;
        8) backup_vault && reset_vault ;;
        9) backup_vault ;;
        0) log_info "Cleanup cancelled" && exit 0 ;;
        *) log_error "Invalid option" && show_menu ;;
    esac
}

# Main execution
main() {
    echo "========================================"
    echo "🧹 Vault Cleanup for Transcendence"
    echo "========================================"
    echo "Environment: $ENVIRONMENT"
    echo "Vault Address: $VAULT_ADDR"
    echo "Force Mode: ${FORCE_MODE:-disabled}"
    echo "========================================"
    echo
    
    check_vault_accessible
    check_vault_auth
    
    # Show warning for production
    if [ "$ENVIRONMENT" = "prod" ]; then
        echo -e "${RED}⚠️  WARNING: You are about to clean PRODUCTION Vault!${NC}"
        echo -e "${RED}⚠️  This could cause service outages and data loss!${NC}"
        echo
        if ! confirm_action "Continue with PRODUCTION cleanup" "high"; then
            log_info "Production cleanup cancelled - wise choice!"
            exit 0
        fi
    fi
    
    if [ "$FORCE_MODE" = "--force" ]; then
        log_warning "Force mode - performing complete reset"
        backup_vault
        reset_vault
    else
        show_menu
    fi
    
    echo
    log_success "Cleanup operations completed"
    echo
    echo "Next steps:"
    echo "  • Review what was cleaned up"
    echo "  • Reinitialize Vault if needed: ./init-vault.sh $ENVIRONMENT"
    echo "  • Update service configurations"
    echo "  • Test service connectivity"
}

# Execute main function
main "$@"