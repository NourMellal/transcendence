# Development Team Policy
# =======================
# Limited access for developers to read secrets during development
# More restrictive than admin but allows debugging

# Read-only access to development secrets
# =======================================
path "secret/data/*/development/*" {
  capabilities = ["read"]
}

path "secret/metadata/*/development/*" {
  capabilities = ["list"]
}

# Read shared development configurations
# =====================================
path "secret/data/shared/*" {
  capabilities = ["read"]
}

path "secret/metadata/shared/*" {
  capabilities = ["list"]
}

# Limited service secret access (read-only)
# =========================================
path "secret/data/user-service/database/development" {
  capabilities = ["read"]
}

path "secret/data/game-service/database/development" {
  capabilities = ["read"]
}

path "secret/data/chat-service/database/development" {
  capabilities = ["read"]
}

path "secret/data/tournament-service/database/development" {
  capabilities = ["read"]
}

# Development tools access
# ========================
path "secret/data/development/tools/*" {
  capabilities = ["read", "create", "update"]
}

# Health and status checking
# ==========================
path "sys/health" {
  capabilities = ["read"]
}

path "sys/seal-status" {
  capabilities = ["read"]
}

# Self token management
# =====================
path "auth/token/lookup-self" {
  capabilities = ["read"]
}

path "auth/token/renew-self" {
  capabilities = ["update"]
}

# Limited policy viewing
# ======================
path "sys/policies/acl" {
  capabilities = ["list"]
}

path "sys/policies/acl/developer-policy" {
  capabilities = ["read"]
}

# No access to production secrets
# ===============================
# Explicitly deny production access
path "secret/data/*/production/*" {
  capabilities = ["deny"]
}

path "secret/data/*/prod/*" {
  capabilities = ["deny"]
}