# Admin Policy for Vault Management
# =================================
# Full administrative access for initial setup and emergency operations
# Should be used sparingly and with proper audit trails

# Full Secret Management
# ======================
path "secret/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# System Configuration
# ====================
path "sys/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# Authentication Methods
# ======================
path "auth/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# Policy Management
# =================
path "sys/policies/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# Audit and Logging
# =================
path "sys/audit" {
  capabilities = ["read", "update"]
}

path "sys/audit/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# Seal/Unseal Operations
# =====================
path "sys/seal" {
  capabilities = ["update"]
}

path "sys/unseal" {
  capabilities = ["update"]
}

# Key Management
# ==============
path "sys/key-status" {
  capabilities = ["read"]
}

path "sys/rotate" {
  capabilities = ["update"]
}

# Mount Management
# ================
path "sys/mounts" {
  capabilities = ["read"]
}

path "sys/mounts/*" {
  capabilities = ["create", "read", "update", "delete"]
}

# Token Management
# ================
path "auth/token/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# Lease Management
# ================
path "sys/leases/lookup" {
  capabilities = ["update"]
}

path "sys/leases/revoke" {
  capabilities = ["update"]
}

path "sys/leases/revoke-prefix/*" {
  capabilities = ["update"]
}

# Health and Status
# =================
path "sys/health" {
  capabilities = ["read"]
}

path "sys/capabilities-self" {
  capabilities = ["update"]
}

# Backup and Restore
# ==================
path "sys/storage/raft/snapshot" {
  capabilities = ["read"]
}

path "sys/storage/raft/snapshot-force" {
  capabilities = ["read"]
}