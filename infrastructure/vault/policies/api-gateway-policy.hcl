

# Allow API Gateway to read JWT secrets
path "secret/data/jwt/auth" {
  capabilities = ["read"]
}

# Allow API Gateway to read OAuth 42 credentials (MANDATORY for PFE)
path "secret/data/api/oauth" {
  capabilities = ["read"]
}

# Allow API Gateway to read shared internal key
path "secret/data/shared/internal-api-key" {
  capabilities = ["read"]
}

# Deny access to other services' secrets
path "secret/data/database/*" {
  capabilities = ["deny"]
}

path "secret/data/game/*" {
  capabilities = ["deny"]
}

path "secret/data/chat/*" {
  capabilities = ["deny"]
}
