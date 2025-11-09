#!/usr/bin/env node
/**
 * Pre-dev check: Ensures Vault and Redis are running
 * Automatically starts them if not running
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);

const VAULT_URL = 'http://localhost:8200';

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
    console.log('📦 Creating new Vault container via docker compose...');
    await execAsync('docker compose -f infrastructure/vault/docker-compose.yml up -d');
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

async function setupServiceEnvironments() {
  console.log('\n🔧 Setting up service environments...');

  const services = [
    { name: 'user-service', needsDataDir: true },
    { name: 'game-service' },
    { name: 'chat-service' },
    { name: 'tournament-service' },
    { name: 'api-gateway' }
  ];

  for (const service of services) {
    const servicePath = join(process.cwd(), 'services', service.name);
    const infrastructurePath = join(process.cwd(), 'infrastructure', service.name);

    const basePath = existsSync(servicePath)
      ? servicePath
      : existsSync(infrastructurePath)
        ? infrastructurePath
        : null;

    if (!basePath) continue;

    const envPath = join(basePath, '.env');
    const envExamplePath = join(basePath, '.env.example');

    if (!existsSync(envPath) && existsSync(envExamplePath)) {
      copyFileSync(envExamplePath, envPath);
      try {
        await execAsync(`sed -i 's/\\r$//' "${envPath}"`);
      } catch {
        // sed may not be available; ignore CRLF fix in that case
      }
      console.log(`  ✅ Created .env for ${service.name}`);
    }

    if (service.needsDataDir) {
      const dataPath = join(basePath, 'data');
      if (!existsSync(dataPath)) {
        mkdirSync(dataPath, { recursive: true });
        console.log(`  ✅ Created data directory for ${service.name}`);
      }
    }
  }

  console.log('✅ Service environments ready');
}

async function main() {
  console.log('🔍 Checking prerequisites...\n');
  
  const vaultRunning = await checkVault();
  const redisRunning = await checkRedis();
  
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

  await setupServiceEnvironments();
  
  console.log('\n🚀 All systems ready!\n');
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  console.error('\n💡 If you need to start fresh, run: bash setup.sh');
  process.exit(1);
});
