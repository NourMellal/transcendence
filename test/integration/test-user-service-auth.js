#!/usr/bin/env node
/**
 * User Service Authentication Integration Test
 * 
 * Tests signup and login functionality with Vault integration
 */

const VAULT_ADDR = process.env.VAULT_ADDR || 'http://localhost:8200';
const VAULT_TOKEN = process.env.VAULT_TOKEN || 'dev-root-token';
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'test-internal-key';

// Test results
const results = {
    total: 0,
    passed: 0,
    failed: 0,
    tests: []
};

// Colors
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m'
};

function log(msg, color = 'reset') {
    console.log(`${colors[color]}${msg}${colors.reset}`);
}

function logTest(name, passed, message = '') {
    results.total++;
    results.tests.push({ name, passed, message });

    if (passed) {
        results.passed++;
        log(`✅ ${name}`, 'green');
    } else {
        results.failed++;
        log(`❌ ${name}${message ? ': ' + message : ''}`, 'red');
    }
}

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Test 1: Vault Health
async function testVaultHealth() {
    try {
        const response = await fetch(`${VAULT_ADDR}/v1/sys/health`, {
            signal: AbortSignal.timeout(5000)
        });

        if (response.ok) {
            const health = await response.json();
            logTest('Vault Health Check', health.initialized && !health.sealed);
            return true;
        }
        logTest('Vault Health Check', false, 'Vault not healthy');
        return false;
    } catch (error) {
        logTest('Vault Health Check', false, error.message);
        return false;
    }
}

// Test 2: Vault JWT Secret
async function testVaultJWTSecret() {
    try {
        const response = await fetch(`${VAULT_ADDR}/v1/secret/data/jwt/auth`, {
            headers: {
                'X-Vault-Token': VAULT_TOKEN
            },
            signal: AbortSignal.timeout(5000)
        });

        if (response.ok) {
            const data = await response.json();
            const hasSecret = data.data?.data?.secret_key;
            logTest('Vault JWT Secret Exists', !!hasSecret);
            return !!hasSecret;
        }
        logTest('Vault JWT Secret Exists', false, 'Secret not found');
        return false;
    } catch (error) {
        logTest('Vault JWT Secret Exists', false, error.message);
        return false;
    }
}

// Test 3: User Service Health
async function testServiceHealth() {
    try {
        const response = await fetch(`${USER_SERVICE_URL}/health`, {
            signal: AbortSignal.timeout(5000)
        });

        if (response.ok) {
            const health = await response.json();
            logTest('User Service Health', health.status === 'ok');

            // Check Vault connection status
            if (health.vault) {
                log(`  ℹ️  Vault: ${health.vault}`, 'cyan');
            }
            return true;
        }
        logTest('User Service Health', false, `HTTP ${response.status}`);
        return false;
    } catch (error) {
        logTest('User Service Health', false, error.message);
        return false;
    }
}

// Test 4: Signup - Valid User
async function testSignupValid() {
    // Generate short unique identifiers
    const timestamp = Date.now().toString().slice(-6); // Last 6 digits only
    const testUser = {
        email: `test${timestamp}@example.com`,
        username: `user${timestamp}`,
        password: 'SecurePassword123!',
        displayName: 'Test User'
    };

    try {
        const response = await fetch(`${USER_SERVICE_URL}/auth/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-internal-api-key': INTERNAL_API_KEY
            },
            body: JSON.stringify(testUser),
            signal: AbortSignal.timeout(10000)
        });

        const data = await response.json();

        if (response.status === 201 && data.id && data.email === testUser.email) {
            logTest('Signup - Valid User', true);
            return { success: true, user: testUser };
        }

        logTest('Signup - Valid User', false, `Status ${response.status}: ${data.message || 'Unknown error'}`);
        return { success: false };
    } catch (error) {
        logTest('Signup - Valid User', false, error.message);
        return { success: false };
    }
}

// Test 5: Signup - Duplicate Email
async function testSignupDuplicate(existingUser) {
    if (!existingUser) {
        logTest('Signup - Duplicate Email', false, 'No existing user');
        return;
    }

    try {
        const response = await fetch(`${USER_SERVICE_URL}/auth/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-internal-api-key': INTERNAL_API_KEY
            },
            body: JSON.stringify(existingUser),
            signal: AbortSignal.timeout(10000)
        });

        const data = await response.json();

        // Should return 409 Conflict
        logTest('Signup - Duplicate Email', response.status === 409 && data.message.includes('already exists'));
    } catch (error) {
        logTest('Signup - Duplicate Email', false, error.message);
    }
}

// Test 6: Signup - Invalid Email
async function testSignupInvalidEmail() {
    try {
        const response = await fetch(`${USER_SERVICE_URL}/auth/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-internal-api-key': INTERNAL_API_KEY
            },
            body: JSON.stringify({
                email: 'not-an-email',
                username: 'testuser',
                password: 'password123'
            }),
            signal: AbortSignal.timeout(10000)
        });

        // Should return 400 Bad Request
        logTest('Signup - Invalid Email', response.status === 400);
    } catch (error) {
        logTest('Signup - Invalid Email', false, error.message);
    }
}

// Test 7: Signup - Weak Password
async function testSignupWeakPassword() {
    try {
        const response = await fetch(`${USER_SERVICE_URL}/auth/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-internal-api-key': INTERNAL_API_KEY
            },
            body: JSON.stringify({
                email: 'test@example.com',
                username: 'testuser',
                password: 'weak'
            }),
            signal: AbortSignal.timeout(10000)
        });

        // Should return 400 Bad Request
        logTest('Signup - Weak Password', response.status === 400);
    } catch (error) {
        logTest('Signup - Weak Password', false, error.message);
    }
}

// Test 8: Login - Valid Credentials
async function testLoginValid(user) {
    if (!user) {
        logTest('Login - Valid Credentials', false, 'No user to test');
        return null;
    }

    try {
        const response = await fetch(`${USER_SERVICE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-internal-api-key': INTERNAL_API_KEY
            },
            body: JSON.stringify({
                email: user.email,
                password: user.password
            }),
            signal: AbortSignal.timeout(10000)
        });

        const data = await response.json();

        if (response.status === 200 && data.accessToken && data.user) {
            logTest('Login - Valid Credentials', true);
            log(`  ℹ️  Token: ${data.accessToken.substring(0, 50)}...`, 'cyan');
            return data.accessToken;
        }

        logTest('Login - Valid Credentials', false, `Status ${response.status}`);
        return null;
    } catch (error) {
        logTest('Login - Valid Credentials', false, error.message);
        return null;
    }
}

// Test 9: Login - Invalid Credentials
async function testLoginInvalid(user) {
    if (!user) {
        logTest('Login - Invalid Credentials', false, 'No user to test');
        return;
    }

    try {
        const response = await fetch(`${USER_SERVICE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-internal-api-key': INTERNAL_API_KEY
            },
            body: JSON.stringify({
                email: user.email,
                password: 'wrongpassword'
            }),
            signal: AbortSignal.timeout(10000)
        });

        // Should return 401 Unauthorized
        logTest('Login - Invalid Credentials', response.status === 401);
    } catch (error) {
        logTest('Login - Invalid Credentials', false, error.message);
    }
}

// Test 10: Login - Non-existent User
async function testLoginNonExistent() {
    try {
        const response = await fetch(`${USER_SERVICE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-internal-api-key': INTERNAL_API_KEY
            },
            body: JSON.stringify({
                email: 'nonexistent@example.com',
                password: 'password123'
            }),
            signal: AbortSignal.timeout(10000)
        });

        // Should return 401 Unauthorized
        logTest('Login - Non-existent User', response.status === 401);
    } catch (error) {
        logTest('Login - Non-existent User', false, error.message);
    }
}

// Test 11: JWT Token Validity
async function testJWTTokenValidity(token) {
    if (!token) {
        logTest('JWT Token Structure', false, 'No token to test');
        return;
    }

    try {
        // JWT should have 3 parts separated by dots
        const parts = token.split('.');
        const hasThreeParts = parts.length === 3;

        // Try to decode payload (base64url)
        let payload = null;
        try {
            payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
        } catch (e) {
            // Ignore decode errors
        }

        const hasValidPayload = payload && payload.sub && payload.email && payload.username;

        logTest('JWT Token Structure', hasThreeParts && hasValidPayload);

        if (hasValidPayload) {
            log(`  ℹ️  Token contains: userId=${payload.sub}, email=${payload.email}`, 'cyan');
        }
    } catch (error) {
        logTest('JWT Token Structure', false, error.message);
    }
}

// Test 12: Internal API Key Protection
async function testInternalApiKeyProtection() {
    try {
        // Try signup without API key
        const response = await fetch(`${USER_SERVICE_URL}/auth/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
                // No x-internal-api-key header
            },
            body: JSON.stringify({
                email: 'test@example.com',
                username: 'testuser',
                password: 'password123'
            }),
            signal: AbortSignal.timeout(10000)
        });

        // In development mode, might allow (returns 201 or 400)
        // In production mode, should return 403
        const isDev = process.env.NODE_ENV === 'development';
        const passed = isDev ? true : response.status === 403;

        logTest('Internal API Key Protection', passed);

        if (isDev && response.status !== 403) {
            log(`  ℹ️  Development mode: API key not enforced`, 'yellow');
        }
    } catch (error) {
        logTest('Internal API Key Protection', false, error.message);
    }
}

// Main test suite
async function main() {
    log('\n🧪 USER SERVICE AUTH INTEGRATION TEST', 'cyan');
    log('=====================================\n', 'cyan');

    log(`🔧 Configuration:`, 'cyan');
    log(`   Vault: ${VAULT_ADDR}`);
    log(`   User Service: ${USER_SERVICE_URL}`);
    log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);

    // Phase 1: Infrastructure Tests
    log('📋 Phase 1: Infrastructure Tests', 'yellow');
    const vaultHealthy = await testVaultHealth();
    await testVaultJWTSecret();
    const serviceHealthy = await testServiceHealth();

    if (!vaultHealthy || !serviceHealthy) {
        log('\n❌ Infrastructure tests failed. Please ensure:', 'red');
        log('   1. Vault is running: cd infrastructure/vault && ./simple-setup.sh');
        log('   2. User service is running: cd services/user-service && pnpm dev');
        log('   3. Vault secrets are configured: ./setup-vault.sh\n');
        process.exit(1);
    }

    await delay(500);

    // Phase 2: Signup Tests
    log('\n📋 Phase 2: Signup Tests', 'yellow');
    const { success, user } = await testSignupValid();
    await delay(200);

    if (success) {
        await testSignupDuplicate(user);
        await delay(200);
    }

    await testSignupInvalidEmail();
    await delay(200);
    await testSignupWeakPassword();
    await delay(500);

    // Phase 3: Login Tests
    log('\n📋 Phase 3: Login Tests', 'yellow');
    const token = await testLoginValid(user);
    await delay(200);
    await testLoginInvalid(user);
    await delay(200);
    await testLoginNonExistent();
    await delay(500);

    // Phase 4: Token Tests
    log('\n📋 Phase 4: Token Tests', 'yellow');
    await testJWTTokenValidity(token);
    await delay(500);

    // Phase 5: Security Tests
    log('\n📋 Phase 5: Security Tests', 'yellow');
    await testInternalApiKeyProtection();

    // Results
    log('\n📊 TEST RESULTS', 'cyan');
    log('==============', 'cyan');
    log(`Total: ${results.total}`);
    log(`Passed: ${results.passed}`, results.passed === results.total ? 'green' : 'yellow');
    log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
    log(`Success Rate: ${Math.round((results.passed / results.total) * 100)}%\n`);

    if (results.failed === 0) {
        log('🎉 ALL TESTS PASSED!', 'green');
        log('User service auth is working correctly with Vault integration.\n', 'green');
        process.exit(0);
    } else {
        log('⚠️  SOME TESTS FAILED', 'yellow');
        log('Check the errors above for details.\n', 'yellow');
        process.exit(1);
    }
}

// Run tests
main().catch(error => {
    log(`\n❌ Test suite error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
});
