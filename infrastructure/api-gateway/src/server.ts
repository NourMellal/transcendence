import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env from project root
dotenv.config({ path: join(__dirname, '../../../.env') });

import fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import proxy from '@fastify/http-proxy';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { readFileSync } from 'fs';
import { initializeVaultJWTService } from './utils/vault-jwt.service';
import { loadGatewayConfig } from './config/gateway-config';
import { createLogger } from '@transcendence/shared-logging';

// Import route handlers
import { registerAuthRoutes } from './routes/auth.routes';
import { registerUserRoutes } from './routes/users.routes';
import { registerFriendRoutes } from './routes/friends.routes';
import { registerGameRoutes } from './routes/games.routes';
import { registerChatRoutes } from './routes/chat.routes';
import { registerTournamentRoutes } from './routes/tournaments.routes';
import { registerStatsRoutes } from './routes/stats.routes';

// Load bundled OpenAPI specification
const openApiSpec = JSON.parse(
    readFileSync(join(__dirname, '../openapi.bundled.json'), 'utf-8')
);

async function createGateway() {
    // Load configuration with Vault integration
    const config = await loadGatewayConfig();

    // Initialize Vault JWT Service
    await initializeVaultJWTService();

    const logger = createLogger('api-gateway', {
        pretty: process.env.LOG_PRETTY === 'true',
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
    });

    const app = fastify({
        // Pino logger from shared-logging; cast to satisfy Fastify's base logger type
        logger: logger as any,
        requestIdLogLabel: 'reqId',
        disableRequestLogging: false,
        requestIdHeader: 'x-request-id'
    });

    // Log configuration status
    if (config.usingVault) {
        app.log.info('✅ API Gateway initialized with Vault integration');
        app.log.info('🔐 Using security configuration from Vault');
    } else {
        app.log.warn('⚠️ API Gateway using environment variables (Vault unavailable)');
    }

    // Enable CORS with Vault configuration
    await app.register(cors, {
        origin: config.corsOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
        exposedHeaders: ['X-Request-ID'],
        maxAge: 86400 // 24 hours
    });

    // Rate limiting with Vault configuration
    await app.register(rateLimit, {
        max: config.rateLimitMax,
        timeWindow: config.rateLimitWindow,
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
    await registerAuthRoutes(app, config.userServiceUrl, config.internalApiKey);
    await registerUserRoutes(app, config.userServiceUrl, config.internalApiKey);
    await registerFriendRoutes(app, config.userServiceUrl, config.internalApiKey);
    await registerGameRoutes(app, config.gameServiceUrl, config.internalApiKey);
    await registerChatRoutes(app, config.chatServiceUrl, config.internalApiKey);
    await registerTournamentRoutes(app, config.tournamentServiceUrl, config.internalApiKey);
    await registerStatsRoutes(app, config.userServiceUrl, config.internalApiKey);

    // WebSocket proxy routes (these bypass validation middleware)
    await app.register(async (fastify) => {
        await fastify.register(proxy, {
            upstream: config.gameServiceUrl,
            prefix: '/api/games/ws',
            websocket: true,
            wsClientOptions: {
                headers: {
                    'x-internal-api-key': config.internalApiKey,
                    'x-forwarded-by': 'transcendence-gateway',
                },
            },
            replyOptions: {
                rewriteRequestHeaders: (originalReq, headers) => {
                    return {
                        ...headers,
                        'x-internal-api-key': config.internalApiKey,
                        'x-forwarded-by': 'transcendence-gateway',
                    };
                }
            }
        });
    });

    await app.register(async (fastify) => {
        await fastify.register(proxy, {
            upstream: config.chatServiceUrl,
            prefix: '/api/chat/ws',
            websocket: true,
            wsClientOptions: {
                headers: {
                    'x-internal-api-key': config.internalApiKey,
                    'x-forwarded-by': 'transcendence-gateway',
                },
            },
            replyOptions: {
                rewriteRequestHeaders: (originalReq, headers) => {
                    return {
                        ...headers,
                        'x-internal-api-key': config.internalApiKey,
                        'x-forwarded-by': 'transcendence-gateway',
                    };
                }
            }
        });
    });

    await app.register(async (fastify) => {
        await fastify.register(proxy, {
            upstream: config.tournamentServiceUrl,
            prefix: '/api/tournaments/ws',
            websocket: true,
            wsClientOptions: {
                headers: {
                    'x-internal-api-key': config.internalApiKey,
                    'x-forwarded-by': 'transcendence-gateway',
                },
            },
            replyOptions: {
                rewriteRequestHeaders: (originalReq, headers) => {
                    return {
                        ...headers,
                        'x-internal-api-key': config.internalApiKey,
                        'x-forwarded-by': 'transcendence-gateway',
                    };
                }
            }
        });
    });

    app.log.info('📡 WebSocket proxies registered: /api/games/ws, /api/chat/ws, /api/tournaments/ws');

    // Health check endpoint
    app.get('/health', async (request, reply) => {
        const startTime = Date.now();

        const healthChecks = await Promise.allSettled([
            fetch(`${config.userServiceUrl}/health`, {
                signal: AbortSignal.timeout(5000)
            }),
            fetch(`${config.gameServiceUrl}/health`, {
                signal: AbortSignal.timeout(5000)
            }),
            fetch(`${config.chatServiceUrl}/health`, {
                signal: AbortSignal.timeout(5000)
            }),
            fetch(`${config.tournamentServiceUrl}/health`, {
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
            app.log.error('Error during graceful shutdown:');
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
            port: config.port,
            host: '0.0.0.0'
        });

        console.log('');
        console.log('🚀 ═══════════════════════════════════════════════════════');
        console.log('🎮 Transcendence API Gateway v2.0');
        console.log('═══════════════════════════════════════════════════════');
        console.log(`📍 Gateway URL: http://localhost:${config.port}`);
        console.log(`📚 API Docs:    http://localhost:${config.port}/api/docs/`);
        console.log(`💚 Health:      http://localhost:${config.port}/health`);  
        console.log(`🌐 CORS Origins: ${config.corsOrigins.join(', ')}`);
        console.log('═══════════════════════════════════════════════════════');
        console.log('📡 Proxied Services:');
        console.log(`   • User Service:       ${config.userServiceUrl}`);
        console.log(`   • Game Service:       ${config.gameServiceUrl}`);
        console.log(`   • Chat Service:       ${config.chatServiceUrl}`);
        console.log(`   • Tournament Service: ${config.tournamentServiceUrl}`);
        console.log('═══════════════════════════════════════════════════════');
        console.log(`🔒 Security: Defense-in-depth (Rate Limit + Schema Validation + JWT Auth)`);
        console.log(`⚡ Rate Limiting: ${config.rateLimitMax} req/${config.rateLimitWindow}`);
        console.log(`🌐 CORS Origins: ${config.corsOrigins.join(', ')}`);
        console.log('═══════════════════════════════════════════════════════');
        console.log('');
    } catch (error) {
        console.error('❌ Failed to start API Gateway:', error);
        process.exit(1);
    }
}

start();
