import { loadChatServiceConfig, logger } from './infrastructure/config';
import { createContainer } from './dependency-injection/container';
import { ChatWebSocketServer } from './infrastructure/websocket/ChatWebSocketServer';
import { createServer } from 'http';
import fastify, { FastifyInstance } from 'fastify';
import { registerErrorHandler } from './infrastructure/http/middlewares/errorHandler';
import { registerRequestLogger } from './infrastructure/http/middlewares/requestLogger';
import { registerRoutes , HttpRoutesDeps } from './infrastructure/http/routes';
import { createInternalApiMiddleware } from './infrastructure/http/middlewares/internalApi.middleware';
interface CreateHttpServerOptions {
    readonly routes: HttpRoutesDeps;
    readonly internalApiKey?: string;
}

export async function createHttpServer(options: CreateHttpServerOptions): Promise<FastifyInstance> {
    const app = fastify({ logger: { level: 'info' } });

    registerRequestLogger(app);
    registerErrorHandler(app);
    registerRoutes(app, options.routes);

    if (options.internalApiKey) {
        const middleware = createInternalApiMiddleware(options.internalApiKey);
        app.addHook('onRequest', middleware);
    }

    return app;
}

export async function startChatService(): Promise<void> {    
    try {
        logger.info('🚀 Starting Chat Service...');
        const config = await loadChatServiceConfig();
        const container = await createContainer(config); 

        // Create HTTP server for both Fastify and Socket.IO
        const app = await createHttpServer({
            routes: {
                chatController: container.controllers.chatController,
                healthController: container.controllers.healthController
            },
            internalApiKey: config.internalApiKey
        });

        // Get the underlying HTTP server from Fastify
        await app.ready();
        const httpServer = createServer((req, res) => {
            app.routing(req, res);
        });

        // Initialize WebSocket server with the container dependencies
        const wsServer = new ChatWebSocketServer(httpServer, {
            roomManager: container.websocket.roomManager,
            connectionHandler: container.websocket.connectionHandler,
            sendMessageHandler: container.websocket.sendMessageHandler,
            disconnectHandler: container.websocket.disconnectHandler,
            authService: container.websocket.authService,
            internalApiKey: config.internalApiKey
        });

        logger.info('✅ WebSocket server initialized');

        const shutdown = async () => {
            logger.info('🛑 Shutting down Chat Service...');
            await app.close();
            httpServer.close();
            process.exit(0);
        };

        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);

        // Start the HTTP server (serves both HTTP and WebSocket)
        await new Promise<void>((resolve, reject) => {
            httpServer.listen(config.port, '0.0.0.0', (err?: Error) => {
                if (err) reject(err);
                else resolve();
            });
        });

        logger.info(`💬 Chat Service running on port ${config.port}`);
        logger.info(`📡 HTTP API: http://localhost:${config.port}/chat`);
        logger.info(`🔌 WebSocket: ws://localhost:${config.port}/api/chat/ws`);

    } catch (error) {
        logger.error(error, 'Failed to start Chat Service');
        process.exit(1);
    }
}

startChatService();   
