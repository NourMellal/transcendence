# Vault Scripts Directory

This directory contains comprehensive scripts for managing HashiCorp Vault in the Transcendence project.

## 📋 Available Scripts

### Core Scripts

#### `init-vault.sh` - Main Initialization Script
**Usage:** `./init-vault.sh [environment]`

The primary script for setting up Vault from scratch. Handles:
- Vault initialization and unsealing
- Secrets engines setup (KV v2, Database, PKI)
- Policy creation and management
- Authentication method configuration (AppRole, JWT)
- Service role creation with credentials
- Environment-specific secret population

**Environments:** `dev`, `staging`, `prod` (default: `dev`)

**Prerequisites:**
- Vault server running and accessible
- `curl` and `jq` installed
- Proper network access to Vault

**Example:**
```bash
# Development setup
./init-vault.sh dev

# Production setup (requires additional confirmations)
./init-vault.sh prod

# Custom Vault address
VAULT_ADDR=https://vault.company.com:8200 ./init-vault.sh prod
```

#### `health-check.sh` - Comprehensive Health Monitoring
**Usage:** `./health-check.sh [environment]`

Performs extensive health checks on Vault and service integration:
- Vault connectivity and seal status
- Authentication and authorization validation
- Secrets engines accessibility
- Service-specific secret verification
- Policy validation
- Performance metrics
- Security configuration checks
- Environment-specific validations

**Example:**
```bash
# Check development environment
./health-check.sh dev

# Check production with specific token
VAULT_TOKEN=your-token ./health-check.sh prod
```

#### `cleanup-vault.sh` - Safe Cleanup and Reset
**Usage:** `./cleanup-vault.sh [environment] [--force]`

Safely cleans up Vault configurations with multiple options:
- Selective cleanup (secrets, policies, auth methods)
- Complete reset functionality
- Automatic backup creation
- Docker container management
- Interactive menu for safe operations

**Options:**
- `--force`: Skip confirmation prompts (dangerous!)
- Interactive menu for selective cleanup

**Example:**
```bash
# Interactive cleanup menu
./cleanup-vault.sh dev

# Force complete reset (use with caution!)
./cleanup-vault.sh dev --force
```

### Environment-Specific Setup Scripts

#### `setup-secrets-dev.sh` - Development Secrets
Configures development-friendly secrets:
- SQLite database configuration
- Mock OAuth credentials
- Local SMTP settings
- Debug-enabled configurations
- Development-safe default values

#### `setup-secrets-prod.sh` - Production Secrets
Sets up production-grade secrets:
- PostgreSQL with SSL
- Real OAuth provider integration
- Production SMTP services
- Enhanced security configurations
- Compliance-ready settings

#### `setup-secrets-default.sh` - Staging/Default Secrets
Balances between development and production:
- PostgreSQL staging setup
- Test OAuth credentials
- Mailtrap email testing
- Feature flag configurations
- Load testing capabilities

### Quick Setup Scripts

#### `quick-setup-dev.sh` - One-Command Development Setup
**Usage:** `./quick-setup-dev.sh`

Perfect for developers who want to get started immediately:
- Automatically starts Vault in Docker dev mode
- Runs complete initialization
- Creates ready-to-use credentials
- Provides quick access information
- No manual configuration required

**Features:**
- Docker-based Vault startup
- Pre-configured development token
- Automatic service credential generation
- Environment file creation
- Usage examples and documentation

## 🔧 Prerequisites

### Required Tools
```bash
# Essential tools
curl      # HTTP requests to Vault API
jq        # JSON processing
docker    # Container management (for quick setup)

# Optional but recommended
openssl   # TLS certificate validation
vault     # Official Vault CLI (for advanced operations)
```

### Installation Commands
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install curl jq docker.io

# macOS (with Homebrew)
brew install curl jq docker

# Windows (with Chocolatey)
choco install curl jq docker-desktop
```

## 🚀 Quick Start Guide

### For Developers (Fastest Method)
```bash
# One command to rule them all
./scripts/quick-setup-dev.sh

# Then source the environment
source infrastructure/vault/.env.dev

# Check that everything works
vault status
vault kv list secret/
```

### For Production Deployment
```bash
# 1. Ensure Vault is running with proper configuration
# 2. Set environment variables
export VAULT_ADDR=https://vault.company.com:8200
export VAULT_TOKEN=your-initial-root-token

# 3. Run initialization
./scripts/init-vault.sh prod

# 4. Verify setup
./scripts/health-check.sh prod

# 5. Secure the root token (rotate immediately after setup)
```

### For Staging Environment
```bash
# Set staging environment
export VAULT_ADDR=https://vault-staging.company.com:8200
export VAULT_TOKEN=staging-root-token

# Initialize with staging configuration
./scripts/init-vault.sh staging

# Verify health
./scripts/health-check.sh staging
```

## 📁 Generated Files and Directories

### Temporary Files (Auto-created)
```
/tmp/vault-init-{environment}.json           # Initialization data (unseal keys, root token)
/tmp/vault-service-credentials-{environment}/ # Service AppRole credentials
infrastructure/vault/.env.dev                # Development environment file
infrastructure/vault/dev-credentials.json    # Quick development credentials
```

### Backup Files (Auto-created during cleanup)
```
/tmp/vault-backup-{timestamp}/               # Automatic backups before cleanup
├── secrets-list.json                       # List of all secrets
├── policies.json                           # All policies
├── auth-methods.json                       # Authentication methods
└── mounts.json                             # Secrets engines
```

## 🔐 Security Best Practices

### Development Environment
- ✅ Use quick setup for local development
- ✅ Keep development tokens simple for easy access
- ✅ Use mock credentials for external services
- ⚠️ Never use development setup for production

### Staging Environment
- ✅ Use real-like but separate credentials
- ✅ Enable additional logging for debugging
- ✅ Test feature flags and experimental features
- ✅ Use test email services (Mailtrap, etc.)

### Production Environment
- 🔒 **CRITICAL:** Rotate root token immediately after setup
- 🔒 **CRITICAL:** Secure unseal keys in separate locations
- 🔒 Enable audit logging
- 🔒 Use TLS encryption (HTTPS)
- 🔒 Implement regular backups
- 🔒 Monitor all access and modifications
- 🔒 Use least-privilege access principles
- 🔒 Regular security audits and updates

## 🔍 Troubleshooting

### Common Issues

#### Vault Not Accessible
```bash
# Check if Vault is running
curl -s http://localhost:8200/v1/sys/health

# Check Docker containers
docker ps | grep vault

# Check logs
docker logs vault-dev
```

#### Authentication Issues
```bash
# Verify token
curl -H "X-Vault-Token: $VAULT_TOKEN" $VAULT_ADDR/v1/auth/token/lookup-self

# Check token permissions
vault token lookup
```

#### Seal Status Problems
```bash
# Check seal status
vault status

# Unseal if needed (development)
vault operator unseal <unseal-key>
```

#### Missing Dependencies
```bash
# Install missing tools
sudo apt-get install curl jq

# Verify installation
curl --version
jq --version
```

### Health Check Failures

Run the health check script for detailed diagnostics:
```bash
./scripts/health-check.sh dev
```

Common failures and solutions:
- **HTTP timeouts:** Check network connectivity and Vault address
- **Authentication errors:** Verify VAULT_TOKEN is set and valid
- **Missing secrets:** Re-run initialization script
- **Policy errors:** Check policy files in `../policies/` directory

## 📊 Script Output Examples

### Successful Initialization
```
🔐 Vault Initialization for Transcendence
Environment: dev
Vault Address: http://localhost:8200

[INFO] Checking prerequisites...
[SUCCESS] Prerequisites check passed
[INFO] Waiting for Vault to be ready...
[SUCCESS] Vault is ready!
[INFO] Initializing Vault...
[SUCCESS] Vault initialized successfully
[SUCCESS] Policies created: user-service-policy
[SUCCESS] Service roles and credentials generated
🎉 Vault initialization completed successfully!
```

### Health Check Results
```
🔍 Vault Health Check for Transcendence
Environment: dev

[✓ PASS] Vault health endpoint - HTTP 200
[✓ PASS] Vault is unsealed and ready  
[✓ PASS] Token validity check - API accessible
[✓ PASS] Database secrets for user-service
[✓ PASS] Policy exists: user-service-policy

Results Summary:
  Total Checks: 25
  Passed: 23
  Warnings: 2
  Failed: 0
Success Rate: 92%
🎉 All critical checks passed!
```

## 🆘 Support and Documentation

### Additional Resources
- [HashiCorp Vault Documentation](https://www.vaultproject.io/docs)
- [Vault API Reference](https://www.vaultproject.io/api-docs)
- [Transcendence Architecture Documentation](../../docs/ARCHITECTURE.md)

### Getting Help
1. Run health check for diagnostics: `./health-check.sh`
2. Check script logs and error messages
3. Verify prerequisites and dependencies
4. Review Vault server logs
5. Consult the main project documentation

### Contributing
When modifying these scripts:
- Test in development environment first
- Update this README with any changes
- Follow security best practices
- Add appropriate error handling
- Include logging for debugging