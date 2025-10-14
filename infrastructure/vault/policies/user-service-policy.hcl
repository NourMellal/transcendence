# User Service Security Policy
# ===========================
# This policy defines what secrets the user-service can access
# Following the principle of least privilege

# Database Access
# ===============
path "secret/data/user-service/database/*" {
  capabilities = ["read"]
}

path "secret/metadata/user-service/database/*" {
  capabilities = ["list"]
}

# Authentication Secrets
# ======================
# JWT signing keys (read-only, shared across services)
path "secret/data/shared/auth/jwt" {
  capabilities = ["read"]
}

# OAuth42 credentials for 42 School integration
path "secret/data/shared/auth/oauth42" {
  capabilities = ["read"]
}

# Session management secrets
path "secret/data/shared/auth/session" {
  capabilities = ["read"]
}

# User Service Specific Secrets
# =============================
# 2FA encryption keys
path "secret/data/user-service/2fa/*" {
  capabilities = ["read"]
}

# File upload configuration
path "secret/data/user-service/storage/*" {
  capabilities = ["read"]
}

# Email service credentials (for notifications)
path "secret/data/user-service/email/*" {
  capabilities = ["read"]
}

# Password hashing secrets
path "secret/data/user-service/security/password-salt" {
  capabilities = ["read"]
}

# Shared Utility Secrets
# ======================
# Encryption keys for sensitive data
path "secret/data/shared/encryption/user-data" {
  capabilities = ["read"]
}

# API rate limiting configurations
path "secret/data/shared/rate-limiting" {
  capabilities = ["read"]
}

# Metadata Access (for listing)
# =============================
path "secret/metadata/user-service/*" {
  capabilities = ["list"]
}

path "secret/metadata/shared/auth/*" {
  capabilities = ["list"]
}

path "secret/metadata/shared/encryption/*" {
  capabilities = ["list"]
}

# Health Check Access
# ==================
# Allow service to verify its access
path "auth/token/lookup-self" {
  capabilities = ["read"]
}

path "auth/token/renew-self" {
  capabilities = ["update"]
}