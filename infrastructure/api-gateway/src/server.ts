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
import jwt from '@fastify/jwt';
import websocket from '@fastify/websocket';
import { getEnvVar, getEnvVarAsNumber, createAPIGatewayVault } from '@transcendence/shared-utils';

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
            JWT_EXPIRES_IN: jwtConfig.expirationHours || '24h',
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
            JWT_SECRET: getEnvVar('JWT_SECRET'),
            JWT_ISSUER: getEnvVar('JWT_ISSUER', 'transcendence'),
            JWT_EXPIRES_IN: getEnvVar('JWT_EXPIRES_IN', '24h'),
            INTERNAL_API_KEY: getEnvVar('INTERNAL_API_KEY'),
            vault: null
        };
    }
}

// Public endpoints that don't require authentication
const PUBLIC_ENDPOINTS = [
    '/api/auth/42/login',
    '/api/auth/42/callback',
    '/health',
    '/api/docs'
];

// Define allowed HTTP methods per endpoint pattern
const ENDPOINT_METHODS: Record<string, string[]> = {
    // Auth endpoints - FIXED PATHS
    '/api/auth/42/login': ['GET'],
    '/api/auth/42/callback': ['GET'],
    '/api/auth/status': ['GET'],
    '/api/auth/logout': ['POST'],
    '/api/auth/2fa/generate': ['POST'],
    '/api/auth/2fa/enable': ['POST'],
    
    // User endpoints
    '/api/users/me': ['GET', 'PATCH'],
    
    // Game endpoints
    '/api/games': ['GET', 'POST'],
    '/api/games/:id': ['GET', 'DELETE'],
    '/api/games/:id/join': ['POST'],
    '/api/games/:id/leave': ['POST'],
    '/api/games/my-games': ['GET'],
    
    // Chat endpoints
    '/api/chat/messages': ['GET', 'POST'],
    '/api/chat/conversations': ['GET'],
    
    // Tournament endpoints
    '/api/tournaments': ['GET', 'POST'],
    '/api/tournaments/:id': ['GET', 'DELETE'],
    '/api/tournaments/:id/join': ['POST'],
    '/api/tournaments/:id/leave': ['POST'],
    '/api/tournaments/:id/bracket': ['GET'],
    '/api/tournaments/my-tournaments': ['GET'],
    
    // Stats endpoints
    '/api/stats/me': ['GET'],
    '/api/stats/users/:id': ['GET'],
    '/api/leaderboard': ['GET']
};

async function createGateway() {
    // Load configuration with Vault integration
    const config = await loadConfiguration();

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
            verifyClient: async (info: any, next: any) => {
                // Extract token from query or header
                const url = new URL(info.req.url!, `http://${info.req.headers.host}`);
                const token = url.searchParams.get('token') || 
                             info.req.headers.authorization?.replace('Bearer ', '');

                if (!token) {
                    return next(false, 401, 'Unauthorized');
                }

                try {
                    // Verify JWT token
                    await app.jwt.verify(token);
                    next(true);
                } catch (err) {
                    next(false, 401, 'Invalid token');
                }
            }
        }
    });

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

    // Response logging hook
    app.addHook('onResponse', async (request, reply) => {
        request.log.info({
            msg: 'Request completed',
            method: request.method,
            url: request.url,
            statusCode: reply.statusCode,
            responseTime: reply.elapsedTime
        });
    });

    // Authentication preHandler based on endpoint
    const authPreHandler = async (request: FastifyRequest, reply: FastifyReply) => {
        const isPublicEndpoint = PUBLIC_ENDPOINTS.some(endpoint => 
            request.url.startsWith(endpoint)
        );

        if (!isPublicEndpoint) {
            await app.authenticate(request, reply);
        }
    };
    const methodValidationPreHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    // Extract path without query parameters
    const path = request.url.split('?')[0];
    
    // Find matching endpoint pattern (handle :id parameters)
    let matchedPattern: string | null = null;
    let allowedMethods: string[] = [];

    for (const [pattern, methods] of Object.entries(ENDPOINT_METHODS)) {
        // Convert pattern to regex (e.g., /api/games/:id -> /api/games/[^/]+)
        const regexPattern = pattern.replace(/:id/g, '[^/]+');
        const regex = new RegExp(`^${regexPattern}$`);
        
        if (regex.test(path)) {
            matchedPattern = pattern;
            allowedMethods = methods;
            break;
        }
    }

    // If no pattern matched, let it through (404 will be handled by notFoundHandler)
    if (!matchedPattern) {
        return;
    }

    // Check if the request method is allowed
    if (!allowedMethods.includes(request.method)) {
        reply.code(405).send({
            statusCode: 405,
            error: 'Method Not Allowed',
            message: `Method ${request.method} is not allowed for ${path}`,
            allowedMethods,
            timestamp: new Date().toISOString(),
            path: request.url
        });
    }
};
    // Service discovery and routing
   const services = [
    //  ADD: Separate auth service proxy
    { 
        prefix: '/api/auth', 
        upstream: config.USER_SERVICE_URL,  // Auth is part of user service
        name: 'user-service'
    },
    { 
        prefix: '/api/users', 
        upstream: config.USER_SERVICE_URL,
        name: 'user-service'
    },
    { 
        prefix: '/api/games', 
        upstream: config.GAME_SERVICE_URL,
        name: 'game-service'
    },
    { 
        prefix: '/api/chat', 
        upstream: config.CHAT_SERVICE_URL,
        name: 'chat-service'
    },
    { 
        prefix: '/api/tournaments', 
        upstream: config.TOURNAMENT_SERVICE_URL,
        name: 'tournament-service'
    },
    { 
        prefix: '/api/stats', 
        upstream: config.USER_SERVICE_URL,
        name: 'user-service'
    },
    { 
        prefix: '/api/leaderboard', 
        upstream: config.USER_SERVICE_URL,
        name: 'user-service'
    }
];

    // Register proxy routes for each service
    for (const service of services) {
        await app.register(async (fastify) => {
            fastify.addHook('preHandler', methodValidationPreHandler);
            fastify.addHook('preHandler', authPreHandler);
            // Register the proxy
            await fastify.register(proxy, {
                upstream: service.upstream,
                prefix: service.prefix,
                http2: false,
                replyOptions: {
                    rewriteRequestHeaders: (originalReq, headers) => {
                        const user = (originalReq as any).user;
                        
                        return {
                            ...headers,
                            // Gateway identification
                            'x-forwarded-by': 'transcendence-gateway',
                            'x-forwarded-at': new Date().toISOString(),
                            'x-forwarded-for': originalReq.socket.remoteAddress || '',
                            'x-forwarded-proto': originalReq.protocol,
                            'x-forwarded-host': originalReq.headers.host || '',
                            
                            // Service identification
                            'x-service-name': service.name,
                            
                            // User context from JWT
                            ...(user && {
                                'x-user-id': user.userId || user.sub,
                                'x-user-email': user.email,
                                'x-username': user.username
                            }),
                            
                            // Internal API key for service-to-service auth
                            ...(config.INTERNAL_API_KEY && { 
                                'x-internal-api-key': config.INTERNAL_API_KEY 
                            }),
                            
                            // Request tracking
                            'x-request-id': (originalReq as any).id
                        };
                    }
                },
                // WebSocket support
                websocket: service.prefix === '/api/games' || service.prefix === '/api/chat'
            });
        });

        app.log.info(`📡 Registered proxy: ${service.prefix} -> ${service.upstream}`);
    }

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
            version: '1.0.0'
        });
    });

    // API documentation endpoint
    app.get('/api/docs', async () => {
        return {
            name: 'Transcendence API Gateway',
            version: '1.0.0',
            description: 'Real-time multiplayer Pong game with microservices architecture',
            features: [
                '🔐 OAuth & 2FA Authentication',
                '🎮 Real-time Pong gameplay',
                '💬 Live chat & messaging',
                '🏆 Tournament system',
                '📊 Statistics & leaderboards'
            ],
            architecture: 'Event-driven microservices with RabbitMQ messaging',
            services: {
                '/api/users': 'User management and authentication',
                '/api/games': 'Game management and real-time gameplay',
                '/api/chat': 'Real-time chat functionality',
                '/api/tournaments': 'Tournament organization and management',
                '/api/stats': 'User statistics and performance metrics',
                '/api/leaderboard': 'Global leaderboard rankings'
            },
            endpoints: {
                '/health': 'Gateway and services health status',
                '/api/docs': 'API documentation (this page)'
            },
            authentication: {
                type: 'JWT Bearer Token',
                header: 'Authorization: Bearer <token>',
                publicEndpoints: PUBLIC_ENDPOINTS
            },
            rateLimit: {
                max: config.RATE_LIMIT_MAX,
                window: config.RATE_LIMIT_WINDOW
            },
            websockets: {
                games: 'ws://localhost:3000/api/games/ws',
                chat: 'ws://localhost:3000/api/chat/ws',
                authentication: 'Required via query param ?token=<jwt> or Authorization header'
            }
        };
    });

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
        console.log('🎮 Transcendence API Gateway');
        console.log('═══════════════════════════════════════════════════════');
        console.log(`📍 Gateway URL: http://localhost:${config.PORT}`);
        console.log(`📚 API Docs:    http://localhost:${config.PORT}/api/docs`);
        console.log(`💚 Health:      http://localhost:${config.PORT}/health`);
        console.log('═══════════════════════════════════════════════════════');
        console.log('📡 Proxied Services:');
        console.log(`   • User Service:       ${config.USER_SERVICE_URL}`);
        console.log(`   • Game Service:       ${config.GAME_SERVICE_URL}`);
        console.log(`   • Chat Service:       ${config.CHAT_SERVICE_URL}`);
        console.log(`   • Tournament Service: ${config.TOURNAMENT_SERVICE_URL}`);
        console.log('═══════════════════════════════════════════════════════');
        console.log(`🔒 Security: JWT Auth + Rate Limiting (${config.RATE_LIMIT_MAX} req/${config.RATE_LIMIT_WINDOW})`);
        console.log(`🌐 CORS Origins: ${config.CORS_ORIGINS.join(', ')}`);
        console.log('═══════════════════════════════════════════════════════');
        console.log('');
    } catch (error) {
        console.error('❌ Failed to start API Gateway:', error);
        process.exit(1);
    }
}

start();