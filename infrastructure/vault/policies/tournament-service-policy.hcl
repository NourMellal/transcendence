# Tournament Service Security Policy
# ==================================
# Manages tournament creation, scheduling, and bracket management

# Database Access
# ===============
path "secret/data/tournament-service/database/*" {
  capabilities = ["read"]
}

path "secret/metadata/tournament-service/database/*" {
  capabilities = ["list"]
}

# Authentication (JWT verification)
# =================================
path "secret/data/shared/auth/jwt" {
  capabilities = ["read"]
}

# Tournament Management
# =====================
# Tournament encryption for sensitive data
path "secret/data/tournament-service/encryption/*" {
  capabilities = ["read"]
}

# Bracket generation algorithms
path "secret/data/tournament-service/algorithms/*" {
  capabilities = ["read"]
}

# Scheduling and Timing
# =====================
# Calendar integration APIs
path "secret/data/tournament-service/calendar/*" {
  capabilities = ["read"]
}

# Timezone and scheduling service
path "secret/data/tournament-service/scheduling/*" {
  capabilities = ["read"]
}

# Prize and Reward Management
# ===========================
# Payment gateway credentials
path "secret/data/tournament-service/payments/*" {
  capabilities = ["read"]
}

# Digital rewards API keys
path "secret/data/tournament-service/rewards/*" {
  capabilities = ["read"]
}

# Crypto/token distribution (if applicable)
path "secret/data/tournament-service/blockchain/*" {
  capabilities = ["read"]
}

# Notification Systems
# ====================
# Tournament reminder notifications
path "secret/data/tournament-service/notifications/email" {
  capabilities = ["read"]
}

# SMS notifications for important updates
path "secret/data/tournament-service/notifications/sms" {
  capabilities = ["read"]
}

# Push notifications for mobile
path "secret/data/tournament-service/notifications/push" {
  capabilities = ["read"]
}

# External Integrations
# =====================
# Streaming platform APIs (Twitch, YouTube)
path "secret/data/tournament-service/streaming/*" {
  capabilities = ["read"]
}

# Tournament broadcasting credentials
path "secret/data/tournament-service/broadcasting/*" {
  capabilities = ["read"]
}

# Analytics and reporting
path "secret/data/tournament-service/analytics/*" {
  capabilities = ["read"]
}

# Registration and Verification
# =============================
# Identity verification service
path "secret/data/tournament-service/verification/*" {
  capabilities = ["read"]
}

# Anti-fraud detection
path "secret/data/tournament-service/fraud-detection/*" {
  capabilities = ["read"]
}

# Shared Services
# ===============
path "secret/data/shared/rate-limiting" {
  capabilities = ["read"]
}

path "secret/data/shared/encryption/user-data" {
  capabilities = ["read"]
}

# Metadata Access
# ===============
path "secret/metadata/tournament-service/*" {
  capabilities = ["list"]
}

path "secret/metadata/shared/auth/jwt" {
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