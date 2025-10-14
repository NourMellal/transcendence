#!/bin/bash
# =======================================================================
# Default/Staging Environment Secret Setup for Vault
# =======================================================================
# This script sets up staging-specific secrets and configurations
# for the Transcendence project. Also serves as fallback for unknown envs.
#
# Usage: Called by init-vault.sh or run standalone with VAULT_TOKEN set
# Environment: STAGING (or default fallback)
# =======================================================================

set -euo pipefail

VAULT_ADDR="${VAULT_ADDR:-https://vault-staging.transcendence.local:8200}"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[STAGING-SETUP]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[STAGING-SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[STAGING-WARNING]${NC} $1"
}

# Ensure we have a token
if [ -z "${VAULT_TOKEN:-}" ]; then
    echo "Error: VAULT_TOKEN environment variable is required"
    exit 1
fi

log_info "Setting up staging secrets..."

# Helper function to generate staging passwords (shorter than prod, longer than dev)
generate_password() {
    local length="${1:-24}"
    openssl rand -base64 $length | tr -d "=+/" | cut -c1-$length
}

# Helper function to generate JWT secret for staging
generate_jwt_secret() {
    openssl rand -base64 48 | tr -d "=+/"
}

# 1. Database Configuration (Staging PostgreSQL)
log_info "Setting up database secrets..."

# Generate database passwords for staging
DB_USER_PASSWORD=$(generate_password 24)
DB_GAME_PASSWORD=$(generate_password 24)
DB_CHAT_PASSWORD=$(generate_password 24)
DB_TOURNAMENT_PASSWORD=$(generate_password 24)

curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/secret/data/database/user-service" \
    -d "{
        \"data\": {
            \"type\": \"postgresql\",
            \"host\": \"postgres-staging.internal\",
            \"port\": \"5432\",
            \"database\": \"transcendence_staging_users\",
            \"username\": \"staging_user_service\",
            \"password\": \"$DB_USER_PASSWORD\",
            \"ssl_mode\": \"require\",
            \"connection_pool_size\": \"10\",
            \"max_idle_connections\": \"2\",
            \"connection_max_lifetime\": \"1800\"
        }
    }" > /dev/null

curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/secret/data/database/game-service" \
    -d "{
        \"data\": {
            \"type\": \"postgresql\",
            \"host\": \"postgres-staging.internal\",
            \"port\": \"5432\",
            \"database\": \"transcendence_staging_games\",
            \"username\": \"staging_game_service\",
            \"password\": \"$DB_GAME_PASSWORD\",
            \"ssl_mode\": \"require\",
            \"connection_pool_size\": \"8\"
        }
    }" > /dev/null

curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/secret/data/database/chat-service" \
    -d "{
        \"data\": {
            \"type\": \"postgresql\",
            \"host\": \"postgres-staging.internal\",
            \"port\": \"5432\",
            \"database\": \"transcendence_staging_chat\",
            \"username\": \"staging_chat_service\",
            \"password\": \"$DB_CHAT_PASSWORD\",
            \"ssl_mode\": \"require\",
            \"connection_pool_size\": \"5\"
        }
    }" > /dev/null

# 2. JWT Secrets (Staging keys)
log_info "Setting up JWT secrets..."

JWT_AUTH_SECRET=$(generate_jwt_secret)
JWT_GAME_SECRET=$(generate_jwt_secret)
JWT_REFRESH_SECRET=$(generate_jwt_secret)

curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/secret/data/jwt/auth" \
    -d "{
        \"data\": {
            \"secret_key\": \"$JWT_AUTH_SECRET\",
            \"refresh_secret_key\": \"$JWT_REFRESH_SECRET\",
            \"issuer\": \"staging.transcendence.app\",
            \"expiration_hours\": \"4\",
            \"refresh_expiration_hours\": \"48\",
            \"algorithm\": \"HS256\"
        }
    }" > /dev/null

curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/secret/data/jwt/game" \
    -d "{
        \"data\": {
            \"secret_key\": \"$JWT_GAME_SECRET\",
            \"issuer\": \"game-staging.transcendence.app\",
            \"expiration_minutes\": \"30\",
            \"algorithm\": \"HS256\"
        }
    }" > /dev/null

# 3. API Keys and External Services (Staging/Test credentials)
log_info "Setting up API keys and external service secrets..."

curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/secret/data/api/oauth" \
    -d '{
        "data": {
            "google_client_id": "staging-google-client-id-replace-me",
            "google_client_secret": "staging-google-client-secret-replace-me",
            "github_client_id": "staging-github-client-id-replace-me",
            "github_client_secret": "staging-github-client-secret-replace-me",
            "42_client_id": "staging-42-client-id-replace-me",
            "42_client_secret": "staging-42-client-secret-replace-me",
            "callback_urls": {
                "google": "https://staging.transcendence.app/auth/google/callback",
                "github": "https://staging.transcendence.app/auth/github/callback",
                "42": "https://staging.transcendence.app/auth/42/callback"
            }
        }
    }' > /dev/null

curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/secret/data/api/email" \
    -d '{
        "data": {
            "smtp_host": "smtp.mailtrap.io",
            "smtp_port": "587",
            "smtp_user": "staging-mailtrap-user",
            "smtp_password": "staging-mailtrap-password",
            "from_email": "noreply@staging.transcendence.app",
            "from_name": "Transcendence Staging",
            "use_tls": "true"
        }
    }' > /dev/null

curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/secret/data/api/cdn" \
    -d '{
        "data": {
            "cloudflare_api_token": "staging-cloudflare-api-token-replace-me",
            "cloudflare_zone_id": "staging-cloudflare-zone-id-replace-me",
            "aws_access_key_id": "staging-aws-access-key-replace-me",
            "aws_secret_access_key": "staging-aws-secret-key-replace-me",
            "aws_region": "us-east-1"
        }
    }' > /dev/null

# 4. Game Configuration (Staging)
log_info "Setting up game secrets..."

GAME_WEBSOCKET_SECRET=$(generate_password 48)
TOURNAMENT_SECRET=$(generate_password 24)

curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/secret/data/game/config" \
    -d "{
        \"data\": {
            \"websocket_secret\": \"$GAME_WEBSOCKET_SECRET\",
            \"match_timeout_minutes\": \"40\",
            \"tournament_secret\": \"$TOURNAMENT_SECRET\",
            \"leaderboard_cache_ttl\": \"120\",
            \"max_concurrent_games\": \"100\",
            \"game_server_regions\": \"us-east-1,eu-west-1\",
            \"debug_mode\": \"false\",
            \"enable_bot_players\": \"true\"
        }
    }" > /dev/null

# 5. Chat Service Configuration (Staging)
log_info "Setting up chat secrets..."

CHAT_ENCRYPTION_KEY=$(generate_password 32)
CHAT_WEBSOCKET_SECRET=$(generate_password 48)

curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/secret/data/chat/config" \
    -d "{
        \"data\": {
            \"encryption_key\": \"$CHAT_ENCRYPTION_KEY\",
            \"websocket_secret\": \"$CHAT_WEBSOCKET_SECRET\",
            \"message_retention_days\": \"60\",
            \"file_upload_max_size\": \"20971520\",
            \"rate_limit_messages_per_minute\": \"60\",
            \"spam_detection_enabled\": \"true\",
            \"profanity_filter_enabled\": \"true\"
        }
    }" > /dev/null

# 6. API Gateway Configuration (Staging)
log_info "Setting up API gateway secrets..."

RATE_LIMIT_SECRET=$(generate_password 24)
API_KEY_SALT=$(generate_password 16)
INTERNAL_API_KEY=$(generate_password 32)

curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/secret/data/gateway/config" \
    -d "{
        \"data\": {
            \"rate_limit_secret\": \"$RATE_LIMIT_SECRET\",
            \"cors_origins\": \"https://staging.transcendence.app,https://staging-admin.transcendence.app\",
            \"api_key_salt\": \"$API_KEY_SALT\",
            \"internal_api_key\": \"$INTERNAL_API_KEY\",
            \"ddos_protection_enabled\": \"true\",
            \"geo_blocking_enabled\": \"false\",
            \"request_logging_enabled\": \"true\"
        }
    }" > /dev/null

# 7. Monitoring and Logging (Staging)
log_info "Setting up monitoring secrets..."

METRICS_SECRET=$(generate_password 24)

curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/secret/data/monitoring/config" \
    -d "{
        \"data\": {
            \"metrics_secret\": \"$METRICS_SECRET\",
            \"log_level\": \"debug\",
            \"datadog_api_key\": \"staging-datadog-api-key-replace-me\",
            \"newrelic_license_key\": \"staging-newrelic-license-replace-me\",
            \"tracing_endpoint\": \"https://trace-api.newrelic.com/trace/v1\",
            \"prometheus_endpoint\": \"https://prometheus-staging.internal:9090\",
            \"grafana_api_key\": \"staging-grafana-api-key-replace-me\",
            \"slack_webhook_url\": \"https://hooks.slack.com/staging-webhook-replace-me\",
            \"sample_rate\": \"0.1\"
        }
    }" > /dev/null

# 8. Security Configuration (Staging)
log_info "Setting up security configuration..."

SESSION_SECRET=$(generate_password 48)
CSRF_SECRET=$(generate_password 24)
ENCRYPTION_SALT=$(generate_password 16)

curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/secret/data/security/config" \
    -d "{
        \"data\": {
            \"session_secret\": \"$SESSION_SECRET\",
            \"csrf_secret\": \"$CSRF_SECRET\",
            \"encryption_salt\": \"$ENCRYPTION_SALT\",
            \"2fa_issuer\": \"Transcendence Staging\",
            \"password_reset_ttl\": \"3600\",
            \"max_login_attempts\": \"10\",
            \"lockout_duration_minutes\": \"15\",
            \"password_min_length\": \"8\",
            \"require_2fa\": \"false\",
            \"allow_weak_passwords\": \"true\"
        }
    }" > /dev/null

# 9. Storage Configuration (Staging)
log_info "Setting up storage secrets..."

curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/secret/data/storage/config" \
    -d '{
        "data": {
            "type": "s3",
            "s3_bucket": "transcendence-staging-assets",
            "s3_region": "us-east-1",
            "s3_access_key_id": "staging-s3-access-key-replace-me",
            "s3_secret_access_key": "staging-s3-secret-key-replace-me",
            "cloudfront_distribution_id": "staging-cloudfront-id-replace-me",
            "max_file_size": "15728640",
            "allowed_types": "image/jpeg,image/png,image/gif,image/webp,video/mp4",
            "image_optimization_enabled": "true",
            "storage_class": "STANDARD_IA"
        }
    }' > /dev/null

# 10. Testing Configuration (Staging-specific)
log_info "Setting up testing configuration..."

curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/secret/data/testing/config" \
    -d '{
        "data": {
            "load_test_enabled": "true",
            "test_user_count": "1000",
            "performance_monitoring": "true",
            "feature_flags_enabled": "true",
            "ab_testing_enabled": "true",
            "synthetic_monitoring": "true",
            "chaos_engineering": "false"
        }
    }' > /dev/null

# 11. SSL/TLS Certificates (Staging)
log_info "Setting up SSL/TLS configuration..."

curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/secret/data/tls/config" \
    -d '{
        "data": {
            "cert_path": "/etc/ssl/certs/staging-transcendence.crt",
            "key_path": "/etc/ssl/private/staging-transcendence.key",
            "ca_cert_path": "/etc/ssl/certs/staging-ca-bundle.crt",
            "auto_renewal_enabled": "true",
            "cert_expiry_alert_days": "14",
            "hsts_max_age": "86400",
            "require_ssl": "true",
            "allow_self_signed": "true"
        }
    }' > /dev/null

# 12. Feature Flags and Experimental Features
log_info "Setting up feature flags..."

curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/secret/data/features/config" \
    -d '{
        "data": {
            "new_game_engine": "true",
            "enhanced_chat": "true",
            "tournament_v2": "false",
            "social_features": "true",
            "mobile_app_support": "true",
            "ai_matchmaking": "false",
            "blockchain_integration": "false",
            "realtime_analytics": "true"
        }
    }' > /dev/null

log_success "Staging secrets setup completed!"

echo
echo "🔒 Staging Secrets Summary:"
echo "   ✅ Database configuration (PostgreSQL staging)"
echo "   ✅ JWT authentication keys (staging-strength)"
echo "   ✅ OAuth provider credentials (REQUIRES UPDATE)"
echo "   ✅ Email service configuration (Mailtrap/testing)"
echo "   ✅ CDN and cloud service credentials (REQUIRES UPDATE)"
echo "   ✅ Game service configuration (staging settings)"
echo "   ✅ Chat service configuration (moderate security)"
echo "   ✅ API Gateway configuration (logging enabled)"
echo "   ✅ Monitoring and logging setup (debug level)"
echo "   ✅ Security configuration (relaxed for testing)"
echo "   ✅ Storage configuration (S3 staging)"
echo "   ✅ Testing configuration (load tests, feature flags)"
echo "   ✅ SSL/TLS configuration (staging certificates)"
echo "   ✅ Feature flags (experimental features enabled)"
echo
echo "⚠️  MANUAL ACTIONS REQUIRED:"
echo "   🔄 Update OAuth credentials with staging/test values"
echo "   🔄 Update monitoring service API keys for staging"
echo "   🔄 Update cloud provider credentials (staging accounts)"
echo "   🔄 Update email service credentials (Mailtrap/test SMTP)"
echo "   🔄 Update notification webhooks for staging channels"
echo
echo "🔗 Secret Paths:"
echo "   • secret/database/* (PostgreSQL staging)"
echo "   • secret/jwt/* (Staging JWT keys)"
echo "   • secret/api/* (External service credentials)"
echo "   • secret/game/* (Game service config)"
echo "   • secret/chat/* (Chat service config)"
echo "   • secret/gateway/* (API Gateway config)"
echo "   • secret/monitoring/* (Monitoring services)"
echo "   • secret/security/* (Security policies)"
echo "   • secret/storage/* (S3 staging)"
echo "   • secret/testing/* (Testing configuration)"
echo "   • secret/tls/* (SSL/TLS configuration)"
echo "   • secret/features/* (Feature flags)"
echo
echo "🧪 Staging Environment Features:"
echo "   • Debug logging enabled for troubleshooting"
echo "   • Relaxed security policies for testing"
echo "   • Feature flags for experimental features"
echo "   • Load testing and performance monitoring"
echo "   • A/B testing capabilities"
echo "   • Synthetic monitoring enabled"
echo "   • Self-signed certificates allowed"
echo "   • Extended JWT expiration for testing"
echo "   • Bot players enabled for game testing"
echo "   • Profanity filter for chat testing"
echo
echo "💡 Staging Notes:"
echo "   • Passwords are shorter than production but secure"
echo "   • JWT tokens have longer expiration for testing"
echo "   • Weak password policies for easy testing"
echo "   • 2FA is optional in staging"
echo "   • Enhanced logging and debugging enabled"
echo "   • Feature flags allow testing new functionality"
echo "   • Email goes to testing services (Mailtrap)"
echo "   • Storage uses S3 Standard-IA for cost savings"