#!/bin/bash
# =======================================================================
# Quick Vault Setup for Development
# =======================================================================
# This script quickly sets up Vault for development with minimal prompts
# Ideal for developers who want to get started quickly
#
# Usage: ./quick-setup-dev.sh
# =======================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VAULT_ADDR="${VAULT_ADDR:-http://localhost:8200}"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[QUICK-SETUP]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if Docker is running
check_docker() {
    if ! command -v docker >/dev/null 2>&1; then
        echo "❌ Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! docker info >/dev/null 2>&1; then
        echo "❌ Docker is not running. Please start Docker first."
        exit 1
    fi
    
    log_success "Docker is available and running"
}

# Start Vault in development mode
start_vault_dev() {
    log_info "Starting Vault in development mode..."
    
    # Stop any existing vault container
    docker stop vault-dev 2>/dev/null || true
    docker rm vault-dev 2>/dev/null || true
    
    # Start Vault in dev mode
    log_info "Starting Vault container..."
    docker run -d \
        --name vault-dev \
        --cap-add=IPC_LOCK \
        -p 8200:8200 \
        -e 'VAULT_DEV_ROOT_TOKEN_ID=dev-root-token-123' \
        -e 'VAULT_DEV_LISTEN_ADDRESS=0.0.0.0:8200' \
        vault:1.15 > /dev/null
    
    log_success "Vault container started"
    
    # Wait for Vault to be ready
    log_info "Waiting for Vault to be ready..."
    local attempts=0
    while [ $attempts -lt 30 ]; do
        if curl -s "$VAULT_ADDR/v1/sys/health" >/dev/null 2>&1; then
            break
        fi
        sleep 2
        ((attempts++))
    done
    
    if [ $attempts -eq 30 ]; then
        echo "❌ Vault failed to start properly"
        exit 1
    fi
    
    log_success "Vault is ready!"
}

# Setup environment
setup_environment() {
    log_info "Setting up development environment..."
    
    # Export token for this session
    export VAULT_TOKEN="dev-root-token-123"
    export VAULT_ADDR="$VAULT_ADDR"
    
    # Create env file for easy sourcing
    cat > "${SCRIPT_DIR}/../.env.dev" << EOF
# Vault Development Environment
export VAULT_ADDR=$VAULT_ADDR
export VAULT_TOKEN=dev-root-token-123

# Quick commands:
# source infrastructure/vault/.env.dev
# vault status
# vault kv list secret/
EOF
    
    log_success "Environment configured"
    log_info "To use vault CLI: source infrastructure/vault/.env.dev"
}

# Run initialization
run_initialization() {
    log_info "Running Vault initialization for development..."
    
    # Make sure we have the token
    export VAULT_TOKEN="dev-root-token-123"
    
    # Run the main initialization script
    bash "${SCRIPT_DIR}/init-vault.sh" dev
}

# Create development credentials file
create_dev_credentials() {
    log_info "Creating development credentials file..."
    
    local creds_file="${SCRIPT_DIR}/../dev-credentials.json"
    
    cat > "$creds_file" << 'EOF'
{
  "vault": {
    "address": "http://localhost:8200",
    "token": "dev-root-token-123"
  },
  "services": {
    "user-service": {
      "role_id": "dev-user-service-role-id",
      "secret_id": "dev-user-service-secret-id"
    },
    "game-service": {
      "role_id": "dev-game-service-role-id", 
      "secret_id": "dev-game-service-secret-id"
    },
    "chat-service": {
      "role_id": "dev-chat-service-role-id",
      "secret_id": "dev-chat-service-secret-id"
    },
    "tournament-service": {
      "role_id": "dev-tournament-service-role-id",
      "secret_id": "dev-tournament-service-secret-id"
    },
    "api-gateway": {
      "role_id": "dev-api-gateway-role-id",
      "secret_id": "dev-api-gateway-secret-id"
    }
  },
  "common_secrets": {
    "database_url": "secret/database/user-service",
    "jwt_secret": "secret/jwt/auth",
    "game_config": "secret/game/config",
    "chat_config": "secret/chat/config"
  }
}
EOF
    
    chmod 600 "$creds_file"
    log_success "Development credentials saved to: $creds_file"
}

# Show quick access info
show_quick_info() {
    echo
    echo "🎉 Quick Development Setup Complete!"
    echo "======================================"
    echo
    echo -e "${CYAN}Vault Information:${NC}"
    echo "  • URL: $VAULT_ADDR"
    echo "  • Root Token: dev-root-token-123"
    echo "  • Mode: Development (not for production!)"
    echo
    echo -e "${CYAN}Quick Commands:${NC}"
    echo "  • Source environment: source infrastructure/vault/.env.dev"
    echo "  • Check health: ./infrastructure/vault/scripts/health-check.sh dev"
    echo "  • Web UI: $VAULT_ADDR/ui (login with root token)"
    echo "  • Stop Vault: docker stop vault-dev"
    echo "  • Restart setup: ./infrastructure/vault/scripts/quick-setup-dev.sh"
    echo
    echo -e "${CYAN}Service Integration:${NC}"
    echo "  • Credentials: infrastructure/vault/dev-credentials.json"
    echo "  • Environment: infrastructure/vault/.env.dev"
    echo
    echo -e "${CYAN}Example Usage:${NC}"
    echo "  # Access a secret from command line:"
    echo "  source infrastructure/vault/.env.dev"
    echo "  vault kv get secret/jwt/auth"
    echo
    echo "  # Test from service:"
    echo "  curl -H \"X-Vault-Token: dev-root-token-123\" \\"
    echo "       $VAULT_ADDR/v1/secret/data/database/user-service"
    echo
    echo -e "${YELLOW}Development Notes:${NC}"
    echo "  ⚠️  This is a development setup with:"
    echo "     • Single unseal key"
    echo "     • Root token stored in plain text"
    echo "     • No TLS encryption"
    echo "     • Data stored in memory (lost on restart)"
    echo "     • NOT suitable for production!"
    echo
    echo "For production setup, use: ./init-vault.sh prod"
}

# Main execution
main() {
    echo "========================================"
    echo "🚀 Quick Vault Setup for Development"
    echo "========================================"
    echo
    
    log_info "This will set up Vault for development with sensible defaults"
    log_warning "This is NOT suitable for production use!"
    echo
    
    check_docker
    start_vault_dev
    setup_environment
    run_initialization
    create_dev_credentials
    show_quick_info
}

# Execute main function
main "$@"