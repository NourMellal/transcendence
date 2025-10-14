# Vault Production Configuration
# ==============================
# Production-ready configuration with security best practices

# Use Consul for HA storage
storage "consul" {
  address = "consul:8500"
  path    = "vault/"
  scheme  = "https"
  tls_ca_file = "/vault/config/tls/consul-ca.crt"
}

# Secure listener with TLS
listener "tcp" {
  address = "0.0.0.0:8200"
  
  tls_cert_file = "/vault/config/tls/vault.crt"
  tls_key_file  = "/vault/config/tls/vault.key"
  tls_min_version = "tls12"
  tls_cipher_suites = "TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384"
}

# Production cluster settings
cluster_addr = "https://vault:8201"
api_addr = "https://vault:8200"

# Security settings
ui = false  # Disable UI in production
disable_mlock = false  # Enable memory lock
log_level = "WARN"

# Production lease times
max_lease_ttl = "8760h"  # 1 year
default_lease_ttl = "168h"  # 1 week

# Auto-unseal with AWS KMS
seal "awskms" {
  region     = "us-east-1"
  kms_key_id = "alias/vault-unseal-key"
}

# Enhanced telemetry
telemetry {
  prometheus_retention_time = "30s"
  disable_hostname = false
  statsd_address = "statsd:8125"
}