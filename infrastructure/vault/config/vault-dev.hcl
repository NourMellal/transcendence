# Vault Development Configuration
# ===============================
# Optimized for local development with minimal security for ease of use

storage "file" {
  path = "/vault/data"
}

listener "tcp" {
  address = "0.0.0.0:8200"
  tls_disable = 1
}

# Development-specific settings
ui = true
disable_mlock = true
log_level = "DEBUG"

# Shorter lease times for development
max_lease_ttl = "24h"
default_lease_ttl = "1h"

# Cluster settings for dev
cluster_addr = "http://0.0.0.0:8201"
api_addr = "http://0.0.0.0:8200"