#!/usr/bin/env node
/**
 * Service Vault Integration Test
 * 
 * Tests that all services can start with Vault integration
 */

import { execSync, spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

const VAULT_ADDR = 'http://localhost:8200';
const VAULT_TOKEN = 'dev-root-token-123';

// Service configurations
const SERVICES = [
    {
        name: 'user-service',
        path: 'services/user-service',
        port: 3001,
        healthPath: '/health'
    },
    {
        name: 'game-service',
        path: 'services/game-service',
        port: 3002,
        healthPath: '/health'
    },
    {
        name: 'chat-service',
        path: 'services/chat-service',
        port: 3003,
        healthPath: '/health'
    },
    {
        name: 'tournament-service',
        path: 'services/tournament-service',
        port: 3004,
        healthPath: '/health'
    },
    {
        name: 'api-gateway',
        path: 'infrastructure/api-gateway',
        port: 3000,
        healthPath: '/health'
    }
];

const runningProcesses = [];
let testResults = {
    vaultHealth: false,
    servicesStarted: {},
    servicesResponding: {},
    totalTests: 0,
    passedTests: 0,
    failedTests: 0
};

// Colors for output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
    log(`✅ ${message}`, 'green');
}

function logError(message) {
    log(`❌ ${message}`, 'red');
}

function logInfo(message) {
    log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
    log(`⚠️  ${message}`, 'yellow');
}

async function checkVaultHealth() {
    testResults.totalTests++;

    try {
        const response = await fetch(`${VAULT_ADDR}/v1/sys/health`);
        if (response.ok) {
            const health = await response.json();
            if (health.initialized && !health.sealed) {
                testResults.vaultHealth = true;
                testResults.passedTests++;
                logSuccess('Vault is healthy and ready');
                return true;
            }
        }
        throw new Error('Vault not initialized or sealed');
    } catch (error) {
        testResults.failedTests++;
        logError(`Vault health check failed: ${error.message}`);
        return false;
    }
}

async function startService(service) {
    return new Promise((resolve, reject) => {
        logInfo(`Starting ${service.name}...`);

        const child = spawn('node', ['dist/server.js'], {
            cwd: path.resolve(service.path),
            env: {
                ...process.env,
                VAULT_ADDR,
                VAULT_TOKEN,
                NODE_ENV: 'development'
            },
            stdio: ['pipe', 'pipe', 'pipe']
        });

        runningProcesses.push(child);

        let startupOutput = '';
        const timeout = setTimeout(() => {
            logError(`${service.name} startup timeout`);
            reject(new Error(`Startup timeout for ${service.name}`));
        }, 30000);

        child.stdout.on('data', (data) => {
            startupOutput += data.toString();
            const output = data.toString();

            // Check for successful startup indicators
            if (output.includes('running on port') || output.includes('started') || output.includes('listening')) {
                clearTimeout(timeout);
                logSuccess(`${service.name} started successfully`);
                resolve(child);
            }
        });

        child.stderr.on('data', (data) => {
            const output = data.toString();
            if (output.includes('Vault integration') || output.includes('Vault not available')) {
                logInfo(`${service.name}: ${output.trim()}`);
            }
        });

        child.on('error', (error) => {
            clearTimeout(timeout);
            logError(`${service.name} failed to start: ${error.message}`);
            reject(error);
        });

        child.on('exit', (code) => {
            if (code !== 0) {
                clearTimeout(timeout);
                logError(`${service.name} exited with code ${code}`);
                reject(new Error(`Service exited with code ${code}`));
            }
        });
    });
}

async function testServiceHealth(service) {
    testResults.totalTests++;

    const maxRetries = 10;
    let retries = 0;

    while (retries < maxRetries) {
        try {
            const response = await fetch(`http://localhost:${service.port}${service.healthPath}`, {
                signal: AbortSignal.timeout(5000)
            });

            if (response.ok) {
                const health = await response.json();
                testResults.servicesResponding[service.name] = true;
                testResults.passedTests++;
                logSuccess(`${service.name} health check passed`);
                return true;
            }
        } catch (error) {
            // Service might still be starting up
            await new Promise(resolve => setTimeout(resolve, 2000));
            retries++;
        }
    }

    testResults.servicesResponding[service.name] = false;
    testResults.failedTests++;
    logError(`${service.name} health check failed after ${maxRetries} retries`);
    return false;
}

async function buildServices() {
    logInfo('Building services...');

    try {
        // Build shared utilities first
        execSync('npm run build', {
            cwd: 'packages/shared-utils',
            stdio: 'pipe'
        });
        logSuccess('Shared utilities built');

        // Build each service
        for (const service of SERVICES) {
            try {
                execSync('npm run build', {
                    cwd: service.path,
                    stdio: 'pipe'
                });
                logSuccess(`${service.name} built`);
            } catch (error) {
                logWarning(`Failed to build ${service.name}, trying to continue...`);
            }
        }
    } catch (error) {
        logError('Build failed:', error.message);
        throw error;
    }
}

async function cleanup() {
    logInfo('Cleaning up processes...');

    for (const process of runningProcesses) {
        try {
            process.kill('SIGTERM');
        } catch (error) {
            // Process might already be dead
        }
    }

    // Wait a moment for graceful shutdown
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Force kill if needed
    for (const process of runningProcesses) {
        try {
            process.kill('SIGKILL');
        } catch (error) {
            // Process might already be dead
        }
    }
}

async function generateReport() {
    const report = `
# Service Vault Integration Test Report

**Date:** ${new Date().toISOString()}
**Vault Address:** ${VAULT_ADDR}

## Summary
- **Total Tests:** ${testResults.totalTests}
- **Passed:** ${testResults.passedTests}
- **Failed:** ${testResults.failedTests}
- **Success Rate:** ${Math.round((testResults.passedTests / testResults.totalTests) * 100)}%

## Vault Health
- **Status:** ${testResults.vaultHealth ? '✅ Healthy' : '❌ Unhealthy'}

## Service Status
${SERVICES.map(service => `
### ${service.name}
- **Started:** ${testResults.servicesStarted[service.name] ? '✅ Yes' : '❌ No'}
- **Health Check:** ${testResults.servicesResponding[service.name] ? '✅ Passed' : '❌ Failed'}
- **Port:** ${service.port}
`).join('')}

## Integration Status
${testResults.vaultHealth && Object.values(testResults.servicesResponding).every(status => status)
            ? '🎉 **ALL SERVICES SUCCESSFULLY INTEGRATED WITH VAULT!**'
            : '⚠️ **SOME INTEGRATION ISSUES DETECTED**'}

---
*Generated by Service Vault Integration Test*
`;

    await fs.writeFile('test-integration-report.md', report);
    logInfo('Test report saved to test-integration-report.md');
}

async function main() {
    log('\n🧪 SERVICE VAULT INTEGRATION TEST', 'cyan');
    log('=====================================\n', 'cyan');

    // Set up cleanup on exit
    process.on('SIGINT', async () => {
        log('\nReceived SIGINT, cleaning up...', 'yellow');
        await cleanup();
        process.exit(1);
    });

    process.on('SIGTERM', async () => {
        log('\nReceived SIGTERM, cleaning up...', 'yellow');
        await cleanup();
        process.exit(1);
    });

    try {
        // 1. Check Vault health
        logInfo('Step 1: Checking Vault health...');
        const vaultHealthy = await checkVaultHealth();

        if (!vaultHealthy) {
            logError('Vault is not available. Please start Vault first:');
            log('docker run --rm -d --name vault-test -p 8200:8200 --cap-add=IPC_LOCK -e "VAULT_DEV_ROOT_TOKEN_ID=dev-root-token-123" hashicorp/vault:1.18');
            process.exit(1);
        }

        // 2. Build services
        logInfo('Step 2: Building services...');
        await buildServices();

        // 3. Start services one by one
        logInfo('Step 3: Starting services...');
        for (const service of SERVICES) {
            try {
                await startService(service);
                testResults.servicesStarted[service.name] = true;
                testResults.totalTests++;
                testResults.passedTests++;
            } catch (error) {
                testResults.servicesStarted[service.name] = false;
                testResults.totalTests++;
                testResults.failedTests++;
                logError(`Failed to start ${service.name}: ${error.message}`);
            }
        }

        // 4. Wait for services to fully initialize
        logInfo('Step 4: Waiting for services to initialize...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // 5. Test service health endpoints
        logInfo('Step 5: Testing service health endpoints...');
        for (const service of SERVICES) {
            if (testResults.servicesStarted[service.name]) {
                await testServiceHealth(service);
            }
        }

        // 6. Generate report
        await generateReport();

        // 7. Display final results
        log('\n📊 FINAL RESULTS', 'magenta');
        log('================', 'magenta');
        logInfo(`Total Tests: ${testResults.totalTests}`);
        logSuccess(`Passed: ${testResults.passedTests}`);
        logError(`Failed: ${testResults.failedTests}`);
        log(`Success Rate: ${Math.round((testResults.passedTests / testResults.totalTests) * 100)}%\n`);

        if (testResults.failedTests === 0) {
            logSuccess('🎉 ALL TESTS PASSED! Vault integration is working correctly.');
        } else {
            logWarning('⚠️  Some tests failed. Check the logs above for details.');
        }

    } catch (error) {
        logError(`Test suite failed: ${error.message}`);
        process.exit(1);
    } finally {
        await cleanup();
    }
}

// Run the test suite
main().catch(error => {
    logError(`Unhandled error: ${error.message}`);
    process.exit(1);
});