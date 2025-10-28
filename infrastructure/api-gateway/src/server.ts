import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../../.env') });

import fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import proxy from '@fastify/http-proxy';
import { getEnvVar, getEnvVarAsNumber } from '@transcendence/shared-utils';
import { createAPIGatewayVault } from '@transcendence/shared-utils/src/vault';
// Load configuration with Vault integration
async function loadConfiguration() {
    const vault = createAPIGatewayVault();

    try {
        await vault.initialize();

        // Get gateway-specific configuration from Vault
        const gatewayConfig = await vault.getServiceConfig();
        const jwtConfig = await vault.getJWTConfig();

        return {
            PORT: getEnvVarAsNumber('GATEWAY_PORT', 3000),
            // Service URLs (these might come from service discovery later)
            USER_SERVICE_URL: getEnvVar('USER_SERVICE_URL', 'http://localhost:3001'),
            GAME_SERVICE_URL: getEnvVar('GAME_SERVICE_URL', 'http://localhost:3002'),
            CHAT_SERVICE_URL: getEnvVar('CHAT_SERVICE_URL', 'http://localhost:3003'),
            TOURNAMENT_SERVICE_URL: getEnvVar('TOURNAMENT_SERVICE_URL', 'http://localhost:3004'),
            // Rate limiting from Vault
            RATE_LIMIT_MAX: gatewayConfig.rateLimitMax || 100,
            RATE_LIMIT_WINDOW: gatewayConfig.rateLimitWindow || '1 minute',
            // CORS configuration from Vault
            CORS_ORIGINS: gatewayConfig.corsOrigins?.split(',') || ['http://localhost:3000'],
            // JWT configuration for request validation
            JWT_SECRET: jwtConfig.secretKey,
            JWT_ISSUER: jwtConfig.issuer,
            // Internal API keys for service communication
            INTERNAL_API_KEY: gatewayConfig.internalApiKey,
            vault
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn('Vault not available, using environment variables:', errorMessage);

        return {
            PORT: getEnvVarAsNumber('GATEWAY_PORT', 3000),
            USER_SERVICE_URL: getEnvVar('USER_SERVICE_URL', 'http://localhost:3001'),
            GAME_SERVICE_URL: getEnvVar('GAME_SERVICE_URL', 'http://localhost:3002'),
            CHAT_SERVICE_URL: getEnvVar('CHAT_SERVICE_URL', 'http://localhost:3003'),
            TOURNAMENT_SERVICE_URL: getEnvVar('TOURNAMENT_SERVICE_URL', 'http://localhost:3004'),
            RATE_LIMIT_MAX: getEnvVarAsNumber('RATE_LIMIT_MAX', 100),
            RATE_LIMIT_WINDOW: getEnvVar('RATE_LIMIT_WINDOW', '1 minute'),
            CORS_ORIGINS: getEnvVar('CORS_ORIGINS', 'http://localhost:3000').split(','),
            JWT_SECRET: getEnvVar('JWT_SECRET'),
            JWT_ISSUER: getEnvVar('JWT_ISSUER', 'transcendence'),
            INTERNAL_API_KEY: getEnvVar('INTERNAL_API_KEY'),
            vault: null
        };
    }
}

async function createGateway() {
    // Load configuration with Vault integration
    const config = await loadConfiguration();

    const app = fastify({
        logger: {
            level: 'info'
        }
    });

    // Log configuration status
    if (config.vault) {
        app.log.info('✅ API Gateway initialized with Vault integration');
        app.log.info('🔐 Using security configuration from Vault');
    } else {
        app.log.warn('⚠️ API Gateway using environment variables (Vault unavailable)');
    }

    // Enable CORS with Vault configuration
    await app.register(cors, {
        origin: config.CORS_ORIGINS,
        credentials: true
    });

    // Rate limiting with Vault configuration
    await app.register(rateLimit, {
        max: config.RATE_LIMIT_MAX,
        timeWindow: config.RATE_LIMIT_WINDOW
    });

    // Service discovery and routing
    const services = [
        { prefix: '/api/users', upstream: config.USER_SERVICE_URL },
        { prefix: '/api/games', upstream: config.GAME_SERVICE_URL },
        { prefix: '/api/chat', upstream: config.CHAT_SERVICE_URL },
        { prefix: '/api/tournaments', upstream: config.TOURNAMENT_SERVICE_URL }
    ];

    // Register proxy routes for each service
    for (const service of services) {
        await app.register(proxy, {
            upstream: service.upstream,
            prefix: service.prefix,
            http2: false,
            replyOptions: {
                rewriteRequestHeaders: (originalReq, headers) => {
                    // Forward original headers and add gateway info
                    return {
                        ...headers,
                        'x-forwarded-by': 'transcendence-gateway',
                        'x-forwarded-at': new Date().toISOString(),
                        // Add internal API key for service authentication
                        ...(config.INTERNAL_API_KEY && { 'x-internal-api-key': config.INTERNAL_API_KEY })
                    };
                }
            }
        });
    }

    // Health check endpoint
    app.get('/health', async () => {
        const healthChecks = await Promise.allSettled([
            fetch(`${config.USER_SERVICE_URL}/health`),
            fetch(`${config.GAME_SERVICE_URL}/health`),
            fetch(`${config.CHAT_SERVICE_URL}/health`),
            fetch(`${config.TOURNAMENT_SERVICE_URL}/health`)
        ]);

        const services = healthChecks.map((result, index) => ({
            name: ['user-service', 'game-service', 'chat-service', 'tournament-service'][index],
            status: result.status === 'fulfilled' && result.value.ok ? 'healthy' : 'unhealthy'
        }));

        return {
            status: 'ok',
            gateway: 'healthy',
            services,
            timestamp: new Date().toISOString()
        };
    });

    // API documentation endpoint
    app.get('/api/docs', async () => {
        return {
            name: 'Transcendence API Gateway',
            version: '1.0.0',
            services: {
                '/api/users': 'User management and authentication',
                '/api/games': 'Game management and real-time gameplay',
                '/api/chat': 'Real-time chat functionality',
                '/api/tournaments': 'Tournament organization and management'
            },
            endpoints: {
                '/health': 'Gateway and services health status',
                '/api/docs': 'API documentation'
            }
        };
    });

    return { app, config };
}

async function start() {
    try {
        const { app, config } = await createGateway();

        await app.listen({
            port: config.PORT,
            host: '0.0.0.0'
        });

        console.log(`🚀 API Gateway running on port ${config.PORT}`);
        console.log(`📚 API Documentation: http://localhost:${config.PORT}/api/docs`);
    } catch (error) {
        console.error('Failed to start API Gateway:', error);
        process.exit(1);
    }
}

start();
