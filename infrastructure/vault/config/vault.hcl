# Vault Configuration for Transcendence 
# ========================================

# Storage Backend
storage "file" {
  path = "/vault/data"
}

# Network Listener
listener "tcp" {
  address = "0.0.0.0:8200"
  tls_disable = 1
}
# Basic Configuration
api_addr = "http://0.0.0.0:8200"
ui = true
disable_mlock = true

# Logging
log_level = "INFO"
log_format = "standard"

# Lease Configuration
max_lease_ttl = "8760h"
default_lease_ttl = "168h"

