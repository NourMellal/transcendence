# API Gateway Security Policy
# ===========================
# Central access point - needs broader access for routing and security

# Authentication and Authorization
# ================================
# JWT signing and verification (both read and limited write for refresh)
path "secret/data/shared/auth/jwt" {
  capabilities = ["read"]
}

# OAuth42 credentials for authentication flow
path "secret/data/shared/auth/oauth42" {
  capabilities = ["read"]
}

# Session management for user sessions
path "secret/data/shared/auth/session" {
  capabilities = ["read"]
}

# API Gateway Specific
# ====================
# Rate limiting configurations
path "secret/data/api-gateway/rate-limiting/*" {
  capabilities = ["read"]
}

# CORS and security headers
path "secret/data/api-gateway/security/*" {
  capabilities = ["read"]
}

# TLS certificates and keys
path "secret/data/api-gateway/tls/*" {
  capabilities = ["read"]
}

# Service Discovery
# =================
# Service endpoint configurations
path "secret/data/api-gateway/services/*" {
  capabilities = ["read"]
}

# Load balancer configurations
path "secret/data/api-gateway/load-balancing/*" {
  capabilities = ["read"]
}

# Health check configurations
path "secret/data/api-gateway/health-checks/*" {
  capabilities = ["read"]
}

# Security and Monitoring
# =======================
# API key management for external clients
path "secret/data/api-gateway/api-keys/*" {
  capabilities = ["read"]
}

# WAF (Web Application Firewall) configurations
path "secret/data/api-gateway/waf/*" {
  capabilities = ["read"]
}

# Logging and audit configurations
path "secret/data/api-gateway/logging/*" {
  capabilities = ["read"]
}

# Analytics and monitoring APIs
path "secret/data/api-gateway/monitoring/*" {
  capabilities = ["read"]
}

# Circuit Breaker Configuration
# =============================
# Circuit breaker settings for resilience
path "secret/data/api-gateway/circuit-breaker/*" {
  capabilities = ["read"]
}

# Timeout and retry configurations
path "secret/data/api-gateway/resilience/*" {
  capabilities = ["read"]
}

# Caching and Performance
# =======================
# Redis credentials for caching
path "secret/data/api-gateway/cache/*" {
  capabilities = ["read"]
}

# CDN configurations
path "secret/data/api-gateway/cdn/*" {
  capabilities = ["read"]
}

# Shared Resources
# ================
# Global rate limiting
path "secret/data/shared/rate-limiting" {
  capabilities = ["read"]
}

# Global encryption keys
path "secret/data/shared/encryption/*" {
  capabilities = ["read"]
}

# Metadata Access
# ===============
path "secret/metadata/api-gateway/*" {
  capabilities = ["list"]
}

path "secret/metadata/shared/*" {
  capabilities = ["list"]
}

# Token Management
# ================
path "auth/token/lookup-self" {
  capabilities = ["read"]
}

path "auth/token/renew-self" {
  capabilities = ["update"]
}

# Special Gateway Permissions
# ===========================
# Gateway may need to verify other service tokens
path "auth/token/lookup" {
  capabilities = ["update"]
}

# Access to auth method configurations (read-only)
path "auth/approle/role/*/role-id" {
  capabilities = ["read"]
}