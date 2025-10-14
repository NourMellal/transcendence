# Chat Service Security Policy
# ============================
# Manages real-time messaging and chat room functionality

# Database Access
# ===============
path "secret/data/chat-service/database/*" {
  capabilities = ["read"]
}

path "secret/metadata/chat-service/database/*" {
  capabilities = ["list"]
}

# Authentication (JWT verification)
# =================================
path "secret/data/shared/auth/jwt" {
  capabilities = ["read"]
}

# Real-time Messaging
# ===================
# WebSocket secrets for chat connections
path "secret/data/chat-service/websocket/*" {
  capabilities = ["read"]
}

# Redis for message queuing and presence
path "secret/data/chat-service/redis/*" {
  capabilities = ["read"]
}

# Message Security
# ================
# End-to-end encryption keys for private messages
path "secret/data/chat-service/message-encryption/*" {
  capabilities = ["read"]
}

# Message signing for integrity
path "secret/data/chat-service/message-signing" {
  capabilities = ["read"]
}

# Content Moderation
# ==================
# AI moderation service API keys
path "secret/data/chat-service/moderation/ai-service" {
  capabilities = ["read"]
}

# Profanity filter configurations
path "secret/data/chat-service/moderation/filters/*" {
  capabilities = ["read"]
}

# Image/file sharing moderation
path "secret/data/chat-service/moderation/media-scan" {
  capabilities = ["read"]
}

# Chat Features
# =============
# File upload service for chat attachments
path "secret/data/chat-service/file-storage/*" {
  capabilities = ["read"]
}

# Emoji and sticker service APIs
path "secret/data/chat-service/content-apis/*" {
  capabilities = ["read"]
}

# Notification Services
# =====================
# Push notification credentials
path "secret/data/chat-service/notifications/push" {
  capabilities = ["read"]
}

# Email notifications for offline messages
path "secret/data/chat-service/notifications/email" {
  capabilities = ["read"]
}

# Chat Room Management
# ====================
# Room encryption keys
path "secret/data/chat-service/rooms/encryption" {
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
path "secret/metadata/chat-service/*" {
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