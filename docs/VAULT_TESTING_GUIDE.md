# 🧪 Vault Testing Guide

This guide will help you test if your Vault implementation is working correctly.

## 🚀 Quick Test (Recommended)

### Option 1: One-Command Full Test
```bash
# This will start Vault, initialize it, and run all tests
./infrastructure/vault/scripts/test-setup.sh
```

### Option 2: Manual Step-by-Step Testing

#### Step 1: Start Vault in Development Mode
```bash
# Start Vault
./infrastructure/vault/scripts/quick-setup-dev.sh

# OR start manually
vault server -dev -dev-root-token-id="dev-root-token-123"
```

#### Step 2: Set Environment Variables
```bash
export VAULT_ADDR="http://localhost:8200"
export VAULT_TOKEN="dev-root-token-123"
```

#### Step 3: Initialize Vault with Our Setup
```bash
./infrastructure/vault/scripts/init-vault.sh dev
```

#### Step 4: Run Comprehensive Tests
```bash
./infrastructure/vault/scripts/test-vault-system.sh
```

## 📋 What Gets Tested

### 🏥 Infrastructure Tests
- ✅ **Vault Server Health** - Is Vault running and accessible?
- ✅ **Authentication Methods** - Token and AppRole auth working?
- ✅ **Security Policies** - All service policies installed?
- ✅ **Secret Engines** - KV v2 and other engines enabled?
- ✅ **Performance** - Response times acceptable?

### 🔐 Secret Operations Tests
- ✅ **Write Secrets** - Can we store secrets?
- ✅ **Read Secrets** - Can we retrieve secrets?
- ✅ **List Secrets** - Can we list secret paths?
- ✅ **Delete Secrets** - Can we remove secrets?

### 💻 TypeScript Client Tests
- ✅ **Client Creation** - VaultClient instantiates correctly?
- ✅ **Authentication** - Client can authenticate with Vault?
- ✅ **Secret Operations** - All CRUD operations work?
- ✅ **Service Helpers** - Service-specific helpers work?
- ✅ **Caching** - Client caching functionality works?
- ✅ **Error Handling** - Proper error handling and fallbacks?
- ✅ **Metrics** - Performance metrics collected?

## 🔍 Manual Testing Commands

### Basic Vault Commands
```bash
# Check Vault status
vault status

# List policies
vault policy list

# Read a policy
vault policy read user-service-policy

# List auth methods
vault auth list

# List secret engines
vault secrets list
```

### Test Secret Operations
```bash
# Write a test secret
vault kv put secret/test/manual key1=value1 key2=value2

# Read the secret
vault kv get secret/test/manual

# List secrets
vault kv list secret/test/

# Delete the secret
vault kv delete secret/test/manual
```

### Test Service-Specific Secrets
```bash
# Check if service secrets exist
vault kv get secret/user-service/database
vault kv get secret/game-service/redis
vault kv get secret/chat-service/websocket
```

## 🌐 Web UI Testing

### Access Vault UI
1. Open http://localhost:8200/ui in your browser
2. Login with token: `dev-root-token-123`
3. Navigate through:
   - **Secrets** → Explore KV v2 engine
   - **Access** → Check policies and auth methods
   - **Tools** → Try the secret lookup tool

## 🐛 Troubleshooting

### Common Issues

#### Vault Not Starting
```bash
# Check if port 8200 is already in use
lsof -i :8200

# Kill existing Vault processes
pkill vault

# Check Vault logs
tail -f /tmp/vault-dev.log
```

#### Authentication Errors
```bash
# Verify token is set
echo $VAULT_TOKEN

# Check token validity
vault auth -method=token

# Renew token if needed
vault token renew
```

#### Permission Errors
```bash
# Check which policies are attached to your token
vault token lookup

# Test policy permissions
vault policy read user-service-policy
```

#### Connection Issues
```bash
# Test basic connectivity
curl -s http://localhost:8200/v1/sys/health

# Check Vault address
echo $VAULT_ADDR

# Test with curl
curl -H "X-Vault-Token: $VAULT_TOKEN" \
     $VAULT_ADDR/v1/sys/health
```

## 📊 Expected Test Results

### ✅ Successful Test Output
```
🧪 Starting Vault System Tests...
[TEST] Testing Vault server health...
[SUCCESS] Vault is healthy and initialized
[TEST] Testing authentication methods...
[SUCCESS] Token authentication working
[SUCCESS] AppRole authentication method enabled
[TEST] Testing security policies...
[SUCCESS] All security policies are installed
[TEST] Testing secret engines...
[SUCCESS] KV v2 secret engine enabled
[TEST] Testing secret operations...
[SUCCESS] Secret write operation successful
[SUCCESS] Secret read operation successful
[SUCCESS] Secret list operation successful
[SUCCESS] Secret delete operation successful

🎉 ALL TESTS PASSED! (8/8)
Vault system is working correctly!
```

### ❌ Common Failure Scenarios

#### Vault Not Running
```
[FAILURE] Cannot connect to Vault at http://localhost:8200
```
**Solution:** Start Vault with `./infrastructure/vault/scripts/quick-setup-dev.sh`

#### Missing Token
```
[FAILURE] VAULT_TOKEN not set
```
**Solution:** `export VAULT_TOKEN="dev-root-token-123"`

#### Policies Not Installed
```
[FAILURE] Policy 'user-service-policy' not found
```
**Solution:** Run `./infrastructure/vault/scripts/init-vault.sh dev`

## 🎯 TypeScript Client Testing

### Run TypeScript Tests
```bash
cd test/vault-test
npm install
node test-vault-client.js
```

### Expected TypeScript Test Output
```
🧪 Starting Vault TypeScript Client Tests...
[INFO] Running test: VaultClient Creation
[PASS] ✅ VaultClient Creation
[INFO] Running test: VaultClient Initialization
[PASS] ✅ VaultClient Initialization
[INFO] Running test: Health Check
[PASS] ✅ Health Check
[INFO] Running test: Secret Operations
[PASS] ✅ Secret Operations

🎉 ALL TESTS PASSED!
```

## 📈 Performance Benchmarks

### Expected Performance
- **Health Check:** < 100ms
- **Secret Read:** < 200ms
- **Secret Write:** < 300ms
- **Authentication:** < 500ms

### Load Testing
```bash
# Run 100 concurrent health checks
for i in {1..100}; do
  curl -s http://localhost:8200/v1/sys/health &
done
wait
```

## 🧹 Cleanup

### Stop Vault and Clean Up
```bash
# Using our cleanup script
./infrastructure/vault/scripts/test-setup.sh --cleanup

# OR manually
pkill vault
rm -f /tmp/vault-dev.pid /tmp/vault-dev.log
```

---

## 🎉 Success Criteria

Your Vault implementation is working correctly if:

1. ✅ All infrastructure tests pass
2. ✅ All TypeScript client tests pass  
3. ✅ Web UI is accessible and functional
4. ✅ Performance meets benchmarks
5. ✅ No security policy violations
6. ✅ Service helpers work with fallbacks

**Next Step:** Once all tests pass, you're ready for [Todo 6: Microservices Integration]!