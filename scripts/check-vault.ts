#!/usr/bin/env node
/**
 * Pre-dev check: Ensures Vault and Redis are running
 * Automatically starts them if not running
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const VAULT_URL = 'http://localhost:8200';
const REDIS_PORT = 6379;

async function checkVault() {
  try {
    const response = await fetch(`${VAULT_URL}/v1/sys/health`);
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function checkRedis() {
  try {
    const { stdout } = await execAsync('docker ps --filter "name=redis-dev" --format "{{.Names}}"');
    return stdout.trim() === 'redis-dev';
  } catch (error) {
    return false;
  }
}

async function startVault() {
  console.log('🔐 Starting Vault...');
  try {
    // Try to start existing container first
    await execAsync('docker start vault-dev 2>/dev/null');
    console.log('✅ Vault started (existing container)');
  } catch (error) {
    // If that fails, create a new container
    console.log('📦 Creating new Vault container...');
    await execAsync(`
      docker run -d \
        --name vault-dev \
        --cap-add=IPC_LOCK \
        -e VAULT_DEV_ROOT_TOKEN_ID=dev-root-token \
        -e VAULT_DEV_LISTEN_ADDRESS=0.0.0.0:8200 \
        -p 8200:8200 \
        hashicorp/vault:1.18 server -dev
    `);
    console.log('✅ Vault created and started');
    
    // Wait for Vault to be ready
    console.log('⏳ Waiting for Vault to be ready...');
    for (let i = 0; i < 30; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (await checkVault()) {
        console.log('✅ Vault is ready!');
        
        // Check if secrets exist
        try {
          const response = await fetch(`${VAULT_URL}/v1/secret/data/jwt/auth`, {
            headers: { 'X-Vault-Token': 'dev-root-token' }
          });
          
          if (!response.ok) {
            console.log('📝 Setting up Vault secrets...');
            await execAsync('bash infrastructure/vault/simple-setup.sh');
            console.log('✅ Vault secrets configured');
          }
        } catch (error) {
          console.log('📝 Setting up Vault secrets...');
          await execAsync('bash infrastructure/vault/simple-setup.sh');
          console.log('✅ Vault secrets configured');
        }
        
        return;
      }
    }
    throw new Error('Vault failed to start in time');
  }
}

async function startRedis() {
  console.log('🗄️  Starting Redis...');
  try {
    // Try to start existing container first
    await execAsync('docker start redis-dev 2>/dev/null');
    console.log('✅ Redis started (existing container)');
  } catch (error) {
    // If that fails, create a new container
    console.log('📦 Creating new Redis container...');
    await execAsync(`
      docker run -d \
        --name redis-dev \
        -p 6379:6379 \
        redis:7-alpine
    `);
    console.log('✅ Redis created and started');
  }
}

async function main() {
  console.log('🔍 Checking prerequisites...\n');
  
  const vaultRunning = await checkVault();
  const redisRunning = await checkRedis();
  
  if (vaultRunning && redisRunning) {
    console.log('✅ Vault is running');
    console.log('✅ Redis is running');
    console.log('\n🚀 All systems ready!\n');
    return;
  }
  
  // Start what's needed
  if (!vaultRunning) {
    await startVault();
  } else {
    console.log('✅ Vault is running');
  }
  
  if (!redisRunning) {
    await startRedis();
  } else {
    console.log('✅ Redis is running');
  }
  
  console.log('\n🚀 All systems ready!\n');
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  console.error('\n💡 If you need to start fresh, run: bash setup.sh');
  process.exit(1);
});
