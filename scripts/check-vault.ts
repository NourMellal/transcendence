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

const VAULT_URL = process.env.VAULT_ADDR || 'http://vault:8200';

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
    const { stdout } = await execAsync('docker compose ps redis --status running');
    return stdout.includes('redis');
  } catch (error) {
    return false;
  }
}

async function startVault() {
  console.log('🔐 Starting Vault...');
  await execAsync('docker compose up -d vault');
  console.log('✅ Vault container is running (docker compose)');

  console.log('⏳ Waiting for Vault to be ready...');
  for (let i = 0; i < 30; i++) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (await checkVault()) {
      console.log('✅ Vault is ready!');

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

async function startRedis() {
  console.log('🗄️  Starting Redis...');
  await execAsync('docker compose up -d redis');
  console.log('✅ Redis container is running (docker compose)');
}

async function setupServiceEnvironments() {
  console.log('\n🔧 Setting up service environments...');

  const services = [
    { name: 'user-service', needsDataDir: true },
    { name: 'game-service' },
    { name: 'chat-service' },
    { name: 'tournament-service' },
    { name: 'api-gateway' } // <-- ensures .env is created at infrastructure/api-gateway
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
        // ignore CRLF fix on systems without sed
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
