# Vault Configuration for Transcendence Microservices
# =================================================
# This configuration supports both development and production environments
# 
# For Development:
# - Uses file storage backend
# - Single node setup
# - TLS disabled for simplicity
#
# For Production:
# - Can be switched to use Consul/etcd storage
# - HA cluster support
# - TLS enabled
# - Auto-unsealing capabilities

# Storage Backend Configuration
# ============================
# Development: File storage (simple, single-node)
storage "file" {
  path = "/vault/data"
}

# Production alternative (uncomment for production):
# storage "consul" {
#   address = "consul:8500"
#   path    = "vault/"
# }

# Network Listener Configuration
# =============================
listener "tcp" {
  address = "0.0.0.0:8200"
  
  # Development: TLS disabled
  tls_disable = 1
  
  # Production: Enable TLS (uncomment for production)
  # tls_cert_file = "/vault/config/tls/vault.crt"
  # tls_key_file  = "/vault/config/tls/vault.key"
  # tls_min_version = "tls12"
}

# Cluster Configuration
# ====================
# Required for HA setups and performance standbys
cluster_addr = "http://0.0.0.0:8201"
api_addr = "http://0.0.0.0:8200"

# UI Configuration
# ===============
# Enable the web interface
ui = true

# Security Configuration
# =====================
# Disable memory lock for Docker compatibility
# In production with proper containers, this can be enabled
disable_mlock = true

# Logging Configuration
# ====================
log_level = "INFO"
log_format = "standard"

# Performance Configuration
# ========================
# Maximum lease duration (1 year)
max_lease_ttl = "8760h"
# Default lease duration (7 days)
default_lease_ttl = "168h"

# Plugin Configuration
# ===================
plugin_directory = "/vault/plugins"

# Telemetry Configuration
# ======================
# Enable metrics for monitoring
telemetry {
  prometheus_retention_time = "30s"
  disable_hostname = true
}

# Seal Configuration
# =================
# Development: Uses unseal keys
# Production: Can use auto-unseal with cloud KMS
# 
# Example AWS KMS auto-unseal (for production):
# seal "awskms" {
#   region     = "us-east-1"
#   kms_key_id = "your-kms-key-id"
# }

# Cache Configuration
# ==================
# Tune performance based on your needs
cache {
  # Use aggressive caching for better performance
  use_auto_auth_token = true
}