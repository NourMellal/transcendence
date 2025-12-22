# Vault Configuration for Transcendence 
# ========================================

# Storage Backend
storage "file" {
  path = "/vault/data"
}

# Network Listener
# TLS-enabled listener. Place TLS cert/key under `/vault/config/tls/server.crt` and
# `/vault/config/tls/server.key` (these files should be mounted and never committed).
listener "tcp" {
  address = "0.0.0.0:8200"
  tls_disable = 0
  tls_cert_file = "/vault/config/tls/server.crt"
  tls_key_file  = "/vault/config/tls/server.key"
}

# Basic Configuration
# Use HTTPS api_addr when TLS is enabled
api_addr = "https://0.0.0.0:8200"
ui = true
disable_mlock = true

# Logging
log_level = "INFO"
log_format = "standard"

# Lease Configuration
max_lease_ttl = "8760h"
default_lease_ttl = "168h"

