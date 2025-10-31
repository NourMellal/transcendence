import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Extend Fastify types for custom decorators
declare module 'fastify' {
    interface FastifyInstance {
        authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
        // optionalAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    }
}

// Load .env from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../../.env') });

import fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import proxy from '@fastify/http-proxy';
import websocket from '@fastify/websocket';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { readFileSync } from 'fs';
import { getEnvVar, getEnvVarAsNumber, createAPIGatewayVault } from '@transcendence/shared-utils';
import { initializeVaultJWTService } from './utils/vault-jwt.service.js';

// Import route handlers
import { registerAuthRoutes } from './routes/auth.routes.js';
import { registerUserRoutes } from './routes/users.routes.js';
import { registerGameRoutes } from './routes/games.routes.js';
import { registerChatRoutes } from './routes/chat.routes.js';
import { registerTournamentRoutes } from './routes/tournaments.routes.js';
import { registerStatsRoutes } from './routes/stats.routes.js';

// Load bundled OpenAPI specification
const openApiSpec = JSON.parse(
    readFileSync(join(__dirname, '../openapi.bundled.json'), 'utf-8')
);

// Load configuration with Vault integration
async function loadConfiguration() {
    const vault = createAPIGatewayVault();

    try {
        await vault.initialize();

        // Get gateway-specific configuration from Vault
        const gatewayConfig = await vault.getServiceConfig();

        return {
            PORT: getEnvVarAsNumber('GATEWAY_PORT', 3000),
            // Service URLs
            USER_SERVICE_URL: getEnvVar('USER_SERVICE_URL', 'http://localhost:3001'),
            GAME_SERVICE_URL: getEnvVar('GAME_SERVICE_URL', 'http://localhost:3002'),
            CHAT_SERVICE_URL: getEnvVar('CHAT_SERVICE_URL', 'http://localhost:3003'),
            TOURNAMENT_SERVICE_URL: getEnvVar('TOURNAMENT_SERVICE_URL', 'http://localhost:3004'),
            // Rate limiting from Vault
            RATE_LIMIT_MAX: gatewayConfig.rateLimitMax || 100,
            RATE_LIMIT_WINDOW: gatewayConfig.rateLimitWindow || '1 minute',
            // CORS configuration from Vault
            CORS_ORIGINS: gatewayConfig.corsOrigins?.split(',') || ['http://localhost:3000'],
            // Internal API keys for service communication
            INTERNAL_API_KEY: gatewayConfig.internalApiKey,
            vault
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn('Vault not available, using environment variables:', errorMessage);
        // FALLBACK TO ENVIRONMENT VARIABLES IF VAULT IS UNAVAILABLE
        return {
            PORT: getEnvVarAsNumber('GATEWAY_PORT', 3000),
            USER_SERVICE_URL: getEnvVar('USER_SERVICE_URL', 'http://localhost:3001'),
            GAME_SERVICE_URL: getEnvVar('GAME_SERVICE_URL', 'http://localhost:3002'),
            CHAT_SERVICE_URL: getEnvVar('CHAT_SERVICE_URL', 'http://localhost:3003'),
            TOURNAMENT_SERVICE_URL: getEnvVar('TOURNAMENT_SERVICE_URL', 'http://localhost:3004'),
            RATE_LIMIT_MAX: getEnvVarAsNumber('RATE_LIMIT_MAX', 100),
            RATE_LIMIT_WINDOW: getEnvVar('RATE_LIMIT_WINDOW', '1 minute'),
            CORS_ORIGINS: getEnvVar('CORS_ORIGINS', 'http://localhost:3000').split(','),
            INTERNAL_API_KEY: getEnvVar('INTERNAL_API_KEY'),
            vault: null
        };
    }
}

// Public endpoints that don't require authentication
// These match the OpenAPI security exemptions
const PUBLIC_ENDPOINTS = [
    '/api/auth/signup',          // User registration
    '/api/auth/login',           // Email/password login
    '/api/auth/42/login',        // OAuth 42 initiation
    '/api/auth/42/callback',     // OAuth 42 callback
    '/health',                   // Health check
    '/api/docs'                  // API documentation
];

// Define allowed HTTP methods per endpoint pattern
// Must match OpenAPI specification exactly
const ENDPOINT_METHODS: Record<string, string[]> = {
    // Authentication endpoints (8 total)
    '/api/auth/signup': ['POST'],
    '/api/auth/login': ['POST'],
    '/api/auth/42/login': ['GET'],
    '/api/auth/42/callback': ['GET'],
    '/api/auth/status': ['GET'],
    '/api/auth/logout': ['POST'],
    '/api/auth/2fa/generate': ['POST'],
    '/api/auth/2fa/enable': ['POST'],
    
    // User endpoints (1 endpoint, 2 methods)
    '/api/users/me': ['GET', 'PATCH'],
    
    // Game endpoints (6 HTTP + 1 WebSocket)
    '/api/games': ['GET', 'POST'],
    '/api/games/:id': ['GET', 'DELETE'],
    '/api/games/:id/join': ['POST'],
    '/api/games/:id/leave': ['POST'],
    '/api/games/my-games': ['GET'],
    // /api/games/ws - WebSocket (handled separately)
    
    // Chat endpoints (2 HTTP + 1 WebSocket)
    '/api/chat/messages': ['GET', 'POST'],
    '/api/chat/conversations': ['GET'],
    // /api/chat/ws - WebSocket (handled separately)
    
    // Tournament endpoints (6 total)
    '/api/tournaments': ['GET', 'POST'],
    '/api/tournaments/:id': ['GET', 'DELETE'],
    '/api/tournaments/:id/join': ['POST'],
    '/api/tournaments/:id/leave': ['POST'],
    '/api/tournaments/:id/bracket': ['GET'],
    '/api/tournaments/my-tournaments': ['GET'],
    
    // Stats endpoints (3 total)
    '/api/stats/me': ['GET'],
    '/api/stats/users/:id': ['GET'],
    '/api/leaderboard': ['GET']
};

async function createGateway() {
    // Load configuration with Vault integration
    const config = await loadConfiguration();

    // Initialize Vault JWT Service
    await initializeVaultJWTService();

    const app = fastify({
        logger: {
            level: 'info',
            serializers: {
                req(req) {
                    return {
                        method: req.method,
                        url: req.url,
                        headers: {
                            host: req.headers.host,
                            'user-agent': req.headers['user-agent'],
                            'content-type': req.headers['content-type']
                        },
                        remoteAddress: req.ip,
                        remotePort: req.socket?.remotePort
                    };
                },
                res(res) {
                    return {
                        statusCode: res.statusCode
                    };
                }
            }
        },
        requestIdLogLabel: 'reqId',
        disableRequestLogging: false,
        requestIdHeader: 'x-request-id'
    });

    // Log configuration status
    if (config.vault) {
        app.log.info('✅ API Gateway initialized with Vault integration');
        app.log.info('🔐 Using security configuration from Vault');
    } else {
        app.log.warn('⚠️ API Gateway using environment variables (Vault unavailable)');
    }

    // Register JWT plugin
    await app.register(jwt, {
        secret: config.JWT_SECRET,
        sign: {
            iss: config.JWT_ISSUER,
            expiresIn: config.JWT_EXPIRES_IN
        },
        messages: {
            badRequestErrorMessage: 'Format is Authorization: Bearer [token]',
            noAuthorizationInHeaderMessage: 'Authorization header is missing',
            authorizationTokenExpiredMessage: 'Authorization token expired',
            authorizationTokenInvalid: (err) => {
                return `Authorization token is invalid: ${err.message}`;
            }
        }
    });

    // Authentication decorator
    app.decorate('authenticate', async function(request: FastifyRequest, reply: FastifyReply) {
        try {
            await request.jwtVerify();
        } catch (err) {
            const error = err as Error;
            reply.code(401).send({
                statusCode: 401,
                error: 'Unauthorized',
                message: error.message || 'Invalid or missing authentication token'
            });
        }
    });

    // Optional authentication decorator (doesn't fail if no token)
    // app.decorate('optionalAuth', async function(request: FastifyRequest, reply: FastifyReply) {
    //     try {
    //         await request.jwtVerify();
    //     } catch (err) {
    //         // Token is optional, don't fail
    //         request.log.debug('No valid token provided for optional auth endpoint');
    //     }
    // });

    // Enable CORS with Vault configuration
    await app.register(cors, {
        origin: config.CORS_ORIGINS,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
        exposedHeaders: ['X-Request-ID'],
        maxAge: 86400 // 24 hours
    });

    // Rate limiting with Vault configuration
    await app.register(rateLimit, {
        max: config.RATE_LIMIT_MAX,
        timeWindow: config.RATE_LIMIT_WINDOW,
        cache: 10000,
        allowList: ['127.0.0.1'],
        redis: undefined, // Can be configured later for distributed rate limiting
        skipOnError: true,
        addHeaders: {
            'x-ratelimit-limit': true,
            'x-ratelimit-remaining': true,
            'x-ratelimit-reset': true,
            'retry-after': true
        }
    });

    // Register WebSocket support for real-time features
    await app.register(websocket, {
        options: {
            maxPayload: 1048576, // 1MB
        }
    });

    // Register Swagger for OpenAPI documentation
    await app.register(swagger, {
        mode: 'static',
        specification: {
            document: openApiSpec
        }
    });

    // Register Swagger UI for interactive API documentation
    await app.register(swaggerUi, {
        routePrefix: '/api/docs',
        uiConfig: {
            docExpansion: 'list',
            deepLinking: true,
            displayRequestDuration: true,
            filter: true,
            tryItOutEnabled: true
        },
        staticCSP: true,
        transformStaticCSP: (header) => header,
    });

    app.log.info('📚 Swagger UI registered at /api/docs');

    // Global error handler
    app.setErrorHandler((error, request, reply) => {
        const statusCode = error.statusCode || 500;

        request.log.error({
            err: error,
            req: request,
            statusCode
        }, 'Request error');

        // Don't expose internal errors in production
        const message = statusCode === 500 && process.env.NODE_ENV === 'production'
            ? 'Internal Server Error'
            : error.message;

        reply.status(statusCode).send({
            statusCode,
            error: error.name || 'Error',
            message,
            timestamp: new Date().toISOString(),
            path: request.url,
            requestId: request.id
        });
    });

    // Not found handler
    app.setNotFoundHandler((request, reply) => {
        reply.code(404).send({
            statusCode: 404,
            error: 'Not Found',
            message: `Route ${request.method}:${request.url} not found`,
            timestamp: new Date().toISOString(),
            path: request.url
        });
    });

    // Request logging hook
    app.addHook('onRequest', async (request, reply) => {
        request.log.info({
            msg: 'Incoming request',
            method: request.method,
            url: request.url
        });
    });

    // Response logging
    app.addHook('onResponse', async (request, reply) => {
        request.log.info({
            msg: 'Request completed',
            method: request.method,
            url: request.url,
            statusCode: reply.statusCode,
            responseTime: reply.elapsedTime
        });
    });

    // Register route handlers with new architecture
    await registerAuthRoutes(app, config.USER_SERVICE_URL, config.INTERNAL_API_KEY);
    await registerUserRoutes(app, config.USER_SERVICE_URL, config.INTERNAL_API_KEY);
    await registerGameRoutes(app, config.GAME_SERVICE_URL, config.INTERNAL_API_KEY);
    await registerChatRoutes(app, config.CHAT_SERVICE_URL, config.INTERNAL_API_KEY);
    await registerTournamentRoutes(app, config.TOURNAMENT_SERVICE_URL, config.INTERNAL_API_KEY);
    await registerStatsRoutes(app, config.USER_SERVICE_URL, config.INTERNAL_API_KEY);

    // WebSocket proxy routes (these bypass validation middleware)
    await app.register(async (fastify) => {
        await fastify.register(proxy, {
            upstream: config.GAME_SERVICE_URL,
            prefix: '/api/games/ws',
            websocket: true,
            replyOptions: {
                rewriteRequestHeaders: (originalReq, headers) => {
                    return {
                        ...headers,
                        'x-internal-api-key': config.INTERNAL_API_KEY,
                        'x-forwarded-by': 'transcendence-gateway',
                    };
                }
            }
        });
    });

    await app.register(async (fastify) => {
        await fastify.register(proxy, {
            upstream: config.CHAT_SERVICE_URL,
            prefix: '/api/chat/ws',
            websocket: true,
            replyOptions: {
                rewriteRequestHeaders: (originalReq, headers) => {
                    return {
                        ...headers,
                        'x-internal-api-key': config.INTERNAL_API_KEY,
                        'x-forwarded-by': 'transcendence-gateway',
                    };
                }
            }
        });
    });

    app.log.info('📡 WebSocket proxies registered: /api/games/ws, /api/chat/ws');

    // Health check endpoint
    app.get('/health', async (request, reply) => {
        const startTime = Date.now();

        const healthChecks = await Promise.allSettled([
            fetch(`${config.USER_SERVICE_URL}/health`, {
                signal: AbortSignal.timeout(5000)
            }),
            fetch(`${config.GAME_SERVICE_URL}/health`, {
                signal: AbortSignal.timeout(5000)
            }),
            fetch(`${config.CHAT_SERVICE_URL}/health`, {
                signal: AbortSignal.timeout(5000)
            }),
            fetch(`${config.TOURNAMENT_SERVICE_URL}/health`, {
                signal: AbortSignal.timeout(5000)
            })
        ]);

        const services = healthChecks.map((result, index) => {
            const serviceName = ['user-service', 'game-service', 'chat-service', 'tournament-service'][index];

            if (result.status === 'fulfilled' && result.value.ok) {
                return { name: serviceName, status: 'healthy' };
            } else {
                const reason = result.status === 'rejected'
                    ? result.reason?.message
                    : `HTTP ${result.value.status}`;
                return {
                    name: serviceName,
                    status: 'unhealthy',
                    reason
                };
            }
        });

        const allHealthy = services.every(s => s.status === 'healthy');
        const responseTime = Date.now() - startTime;

        return reply.code(allHealthy ? 200 : 503).send({
            status: allHealthy ? 'ok' : 'degraded',
            gateway: 'healthy',
            services,
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            responseTime: `${responseTime}ms`,
            version: '2.0.0',
            architecture: 'route-based with defense-in-depth security'
        });
    });

    // Note: Swagger automatically provides these endpoints:
    // - /api/docs - Swagger UI (interactive documentation)
    // - /api/docs/json - OpenAPI spec as JSON
    // - /api/docs/yaml - OpenAPI spec as YAML

    // Graceful shutdown
    const closeGracefully = async (signal: string) => {
        app.log.info(`Received ${signal}, closing gracefully`);

        try {
            await app.close();
            app.log.info('Gateway closed successfully');
            process.exit(0);
        } catch (err) {
            app.log.error('Error during graceful shutdown:', err);
            process.exit(1);
        }
    };

    process.on('SIGTERM', () => closeGracefully('SIGTERM'));
    process.on('SIGINT', () => closeGracefully('SIGINT'));

    // Graceful shutdown
    const closeGracefully = async (signal: string) => {
        app.log.info(`Received ${signal}, closing gracefully`);
        
        try {
            await app.close();
            app.log.info('Gateway closed successfully');
            process.exit(0);
        } catch (err) {
            app.log.error('Error during graceful shutdown:', err);
            process.exit(1);
        }
    };

    process.on('SIGTERM', () => closeGracefully('SIGTERM'));
    process.on('SIGINT', () => closeGracefully('SIGINT'));

    return { app, config };
}

async function start() {
    try {
        const { app, config } = await createGateway();

        await app.listen({
            port: config.PORT,
            host: '0.0.0.0'
        });

        console.log('');
        console.log('🚀 ═══════════════════════════════════════════════════════');
        console.log('🎮 Transcendence API Gateway v2.0');
        console.log('═══════════════════════════════════════════════════════');
        console.log(`📍 Gateway URL: http://localhost:${config.PORT}`);
        console.log(`📚 API Docs:    http://localhost:${config.PORT}/api/docs/`);
        console.log(`💚 Health:      http://localhost:${config.PORT}/health`);
        console.log('═══════════════════════════════════════════════════════');
        console.log('📡 Proxied Services:');
        console.log(`   • User Service:       ${config.USER_SERVICE_URL}`);
        console.log(`   • Game Service:       ${config.GAME_SERVICE_URL}`);
        console.log(`   • Chat Service:       ${config.CHAT_SERVICE_URL}`);
        console.log(`   • Tournament Service: ${config.TOURNAMENT_SERVICE_URL}`);
        console.log('═══════════════════════════════════════════════════════');
        console.log(`🔒 Security: Defense-in-depth (Rate Limit + Schema Validation + JWT Auth)`);
        console.log(`⚡ Rate Limiting: ${config.RATE_LIMIT_MAX} req/${config.RATE_LIMIT_WINDOW}`);
        console.log(`🌐 CORS Origins: ${config.CORS_ORIGINS.join(', ')}`);
        console.log('═══════════════════════════════════════════════════════');
        console.log('');
    } catch (error) {
        console.error('❌ Failed to start API Gateway:', error);
        process.exit(1);
    }
}

await start();
