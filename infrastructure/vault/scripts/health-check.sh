#!/bin/bash
# =======================================================================
# Vault Health Check and Monitoring Script
# =======================================================================
# This script performs comprehensive health checks on Vault and its
# integration with the Transcendence microservices
#
# Usage: ./health-check.sh [environment]
# Environments: dev, staging, prod
# Default: dev
# =======================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENVIRONMENT="${1:-dev}"
VAULT_ADDR="${VAULT_ADDR:-http://localhost:8200}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Status tracking
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓ PASS]${NC} $1"
    ((PASSED_CHECKS++))
}

log_warning() {
    echo -e "${YELLOW}[⚠ WARN]${NC} $1"
    ((WARNING_CHECKS++))
}

log_error() {
    echo -e "${RED}[✗ FAIL]${NC} $1"
    ((FAILED_CHECKS++))
}

log_section() {
    echo -e "${PURPLE}[SECTION]${NC} $1"
    echo "=========================================="
}

# Increment check counter
check_counter() {
    ((TOTAL_CHECKS++))
}

# Check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Make HTTP request and check response
http_check() {
    local url="$1"
    local expected_status="${2:-200}"
    local description="$3"
    
    check_counter
    
    if command_exists curl; then
        local response
        response=$(curl -s -w "%{http_code}" -o /dev/null "$url" 2>/dev/null || echo "000")
        
        if [ "$response" = "$expected_status" ]; then
            log_success "$description - HTTP $response"
        else
            log_error "$description - Expected HTTP $expected_status, got $response"
        fi
    else
        log_error "curl not available for HTTP check: $description"
    fi
}

# Make authenticated Vault API request
vault_api_check() {
    local path="$1"
    local description="$2"
    local token="${VAULT_TOKEN:-}"
    
    check_counter
    
    if [ -z "$token" ]; then
        log_error "$description - No VAULT_TOKEN available"
        return 1
    fi
    
    if command_exists curl; then
        local response
        response=$(curl -s -H "X-Vault-Token: $token" "$VAULT_ADDR/v1/$path" 2>/dev/null)
        
        if echo "$response" | grep -q '"errors"'; then
            log_error "$description - API returned errors: $(echo "$response" | jq -r '.errors[]' 2>/dev/null || echo 'Unknown error')"
        else
            log_success "$description - API accessible"
        fi
    else
        log_error "curl not available for Vault API check: $description"
    fi
}

# Check prerequisites
check_prerequisites() {
    log_section "Prerequisites Check"
    
    # Check curl
    check_counter
    if command_exists curl; then
        log_success "curl is available"
    else
        log_error "curl is required but not installed"
    fi
    
    # Check jq
    check_counter
    if command_exists jq; then
        log_success "jq is available"
    else
        log_warning "jq is recommended for JSON parsing"
    fi
    
    # Check openssl
    check_counter
    if command_exists openssl; then
        log_success "openssl is available"
    else
        log_warning "openssl is recommended for TLS checks"
    fi
}

# Basic Vault connectivity
check_vault_connectivity() {
    log_section "Vault Connectivity"
    
    log_info "Checking Vault at: $VAULT_ADDR"
    
    # Basic health endpoint
    http_check "$VAULT_ADDR/v1/sys/health" "200" "Vault health endpoint"
    
    # Seal status
    check_counter
    if command_exists curl; then
        local seal_status
        seal_status=$(curl -s "$VAULT_ADDR/v1/sys/seal-status" 2>/dev/null)
        
        if echo "$seal_status" | jq -e '.sealed' >/dev/null 2>&1; then
            local is_sealed
            is_sealed=$(echo "$seal_status" | jq -r '.sealed')
            
            if [ "$is_sealed" = "false" ]; then
                log_success "Vault is unsealed and ready"
            else
                log_error "Vault is sealed - needs to be unsealed"
            fi
        else
            log_error "Cannot determine Vault seal status"
        fi
    else
        log_error "Cannot check Vault seal status - curl not available"
    fi
}

# Authentication and authorization
check_vault_auth() {
    log_section "Vault Authentication & Authorization"
    
    if [ -z "${VAULT_TOKEN:-}" ]; then
        log_warning "No VAULT_TOKEN provided - skipping auth checks"
        return
    fi
    
    # Check token validity
    vault_api_check "auth/token/lookup-self" "Token validity check"
    
    # Check policies
    vault_api_check "sys/policies/acl" "Policy listing"
    
    # Check auth methods
    vault_api_check "sys/auth" "Authentication methods"
    
    # Check AppRole auth
    vault_api_check "auth/approle/role" "AppRole configuration"
}

# Secrets engines and accessibility
check_secrets_engines() {
    log_section "Secrets Engines"
    
    if [ -z "${VAULT_TOKEN:-}" ]; then
        log_warning "No VAULT_TOKEN provided - skipping secrets engine checks"
        return
    fi
    
    # List mounted secrets engines
    vault_api_check "sys/mounts" "Secrets engines listing"
    
    # Check KV v2 engine
    vault_api_check "secret/metadata" "KV v2 secrets engine"
    
    # Check database engine
    vault_api_check "database/config" "Database secrets engine"
    
    # Check PKI engine
    vault_api_check "pki/config/ca" "PKI secrets engine"
}

# Service-specific secret checks
check_service_secrets() {
    log_section "Service Secrets Accessibility"
    
    if [ -z "${VAULT_TOKEN:-}" ]; then
        log_warning "No VAULT_TOKEN provided - skipping service secret checks"
        return
    fi
    
    local services=("user-service" "game-service" "chat-service" "tournament-service" "api-gateway")
    
    for service in "${services[@]}"; do
        # Check if service secrets exist
        vault_api_check "secret/metadata/database/$service" "Database secrets for $service"
        
        # Check if service policy exists
        vault_api_check "sys/policies/acl/${service}-policy" "Policy for $service"
        
        # Check if AppRole exists for service
        vault_api_check "auth/approle/role/$service" "AppRole for $service"
    done
    
    # Check common secrets
    vault_api_check "secret/metadata/jwt/auth" "JWT authentication secrets"
    vault_api_check "secret/metadata/security/config" "Security configuration"
    vault_api_check "secret/metadata/monitoring/config" "Monitoring configuration"
}

# Policy validation
check_policies() {
    log_section "Policy Validation"
    
    if [ -z "${VAULT_TOKEN:-}" ]; then
        log_warning "No VAULT_TOKEN provided - skipping policy checks"
        return
    fi
    
    local policies=("user-service-policy" "game-service-policy" "chat-service-policy" 
                   "tournament-service-policy" "api-gateway-policy" "admin-policy" "developer-policy")
    
    for policy in "${policies[@]}"; do
        check_counter
        
        if command_exists curl; then
            local response
            response=$(curl -s -H "X-Vault-Token: $VAULT_TOKEN" \
                       "$VAULT_ADDR/v1/sys/policies/acl/$policy" 2>/dev/null)
            
            if echo "$response" | jq -e '.data.policy' >/dev/null 2>&1; then
                log_success "Policy exists: $policy"
            else
                log_error "Policy missing: $policy"
            fi
        else
            log_error "Cannot check policy: $policy - curl not available"
        fi
    done
}

# Performance and metrics
check_performance() {
    log_section "Performance & Metrics"
    
    # Response time check
    check_counter
    if command_exists curl; then
        local start_time end_time response_time
        start_time=$(date +%s%N)
        curl -s "$VAULT_ADDR/v1/sys/health" >/dev/null 2>&1
        end_time=$(date +%s%N)
        response_time=$(( (end_time - start_time) / 1000000 ))
        
        if [ "$response_time" -lt 100 ]; then
            log_success "Response time: ${response_time}ms (excellent)"
        elif [ "$response_time" -lt 500 ]; then
            log_success "Response time: ${response_time}ms (good)"
        elif [ "$response_time" -lt 1000 ]; then
            log_warning "Response time: ${response_time}ms (acceptable)"
        else
            log_error "Response time: ${response_time}ms (slow)"
        fi
    else
        log_error "Cannot measure response time - curl not available"
    fi
    
    # Check metrics endpoint if available
    http_check "$VAULT_ADDR/v1/sys/metrics" "200" "Metrics endpoint"
}

# Security checks
check_security() {
    log_section "Security Configuration"
    
    # TLS check if HTTPS
    if [[ "$VAULT_ADDR" == https* ]]; then
        check_counter
        if command_exists openssl; then
            local hostname port
            hostname=$(echo "$VAULT_ADDR" | sed 's|https://||' | cut -d: -f1)
            port=$(echo "$VAULT_ADDR" | sed 's|https://||' | cut -d: -f2)
            port=${port:-443}
            
            if echo | openssl s_client -connect "$hostname:$port" -servername "$hostname" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null; then
                log_success "TLS certificate is valid"
            else
                log_error "TLS certificate validation failed"
            fi
        else
            log_warning "Cannot check TLS certificate - openssl not available"
        fi
    else
        check_counter
        log_warning "Vault is not using HTTPS - consider enabling TLS for production"
    fi
    
    # Check audit logging
    if [ -n "${VAULT_TOKEN:-}" ]; then
        vault_api_check "sys/audit" "Audit logging configuration"
    fi
}

# Environment-specific checks
check_environment_specific() {
    log_section "Environment-Specific Checks ($ENVIRONMENT)"
    
    case $ENVIRONMENT in
        dev)
            check_counter
            log_info "Development environment checks"
            if [[ "$VAULT_ADDR" == *"localhost"* ]] || [[ "$VAULT_ADDR" == *"127.0.0.1"* ]]; then
                log_success "Development Vault running locally"
            else
                log_warning "Development Vault not running locally"
            fi
            ;;
        staging)
            check_counter
            log_info "Staging environment checks"
            if [[ "$VAULT_ADDR" == *"staging"* ]]; then
                log_success "Staging Vault endpoint detected"
            else
                log_warning "Vault endpoint may not be staging-specific"
            fi
            ;;
        prod)
            check_counter
            log_info "Production environment checks"
            if [[ "$VAULT_ADDR" == https* ]]; then
                log_success "Production Vault using HTTPS"
            else
                log_error "Production Vault should use HTTPS"
            fi
            
            check_counter
            if [[ "$VAULT_ADDR" == *"localhost"* ]] || [[ "$VAULT_ADDR" == *"127.0.0.1"* ]]; then
                log_error "Production Vault should not be localhost"
            else
                log_success "Production Vault using external endpoint"
            fi
            ;;
    esac
}

# Docker integration checks (if applicable)
check_docker_integration() {
    log_section "Docker Integration"
    
    check_counter
    if command_exists docker; then
        log_success "Docker is available"
        
        # Check if Vault container is running
        check_counter
        if docker ps --format "table {{.Names}}" | grep -q "vault"; then
            log_success "Vault container is running"
        else
            log_warning "No Vault container found in docker ps"
        fi
    else
        log_warning "Docker not available - skipping container checks"
    fi
    
    # Check docker-compose if available
    check_counter
    if command_exists docker-compose; then
        log_success "docker-compose is available"
    else
        log_warning "docker-compose not available"
    fi
}

# Generate health report
generate_report() {
    log_section "Health Check Summary"
    
    echo -e "${CYAN}Environment:${NC} $ENVIRONMENT"
    echo -e "${CYAN}Vault Address:${NC} $VAULT_ADDR"
    echo -e "${CYAN}Timestamp:${NC} $(date)"
    echo
    echo -e "${CYAN}Results Summary:${NC}"
    echo -e "  Total Checks: $TOTAL_CHECKS"
    echo -e "  ${GREEN}Passed: $PASSED_CHECKS${NC}"
    echo -e "  ${YELLOW}Warnings: $WARNING_CHECKS${NC}"
    echo -e "  ${RED}Failed: $FAILED_CHECKS${NC}"
    echo
    
    local success_rate
    if [ "$TOTAL_CHECKS" -gt 0 ]; then
        success_rate=$(( (PASSED_CHECKS * 100) / TOTAL_CHECKS ))
        echo -e "${CYAN}Success Rate:${NC} $success_rate%"
    fi
    
    if [ "$FAILED_CHECKS" -eq 0 ]; then
        echo -e "${GREEN}🎉 All critical checks passed!${NC}"
        if [ "$WARNING_CHECKS" -gt 0 ]; then
            echo -e "${YELLOW}⚠️  Some warnings noted - review above${NC}"
        fi
    else
        echo -e "${RED}❌ Some checks failed - immediate attention required${NC}"
    fi
    
    echo
    echo "Health check completed."
}

# Main execution
main() {
    echo "========================================"
    echo "🔍 Vault Health Check for Transcendence"
    echo "========================================"
    echo "Environment: $ENVIRONMENT"
    echo "Vault Address: $VAULT_ADDR"
    echo "========================================"
    echo
    
    check_prerequisites
    check_vault_connectivity
    check_vault_auth
    check_secrets_engines
    check_service_secrets
    check_policies
    check_performance
    check_security
    check_environment_specific
    check_docker_integration
    generate_report
}

# Execute main function
main "$@"