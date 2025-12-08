import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { createAuthMiddleware } from './middleware/authMiddleware';
import { registerErrorHandler } from './middleware/errorHandler';  
import { registerRequestLogger } from './middleware/requestLogger';
import { registerRoutes, HttpRoutesDeps } from './routes';     
interface CreateHttpServerOptions {
    readonly routes: HttpRoutesDeps;
    readonly internalApiKey?: string;
}

export function createHttpServer(options: CreateHttpServerOptions): FastifyInstance {
    const app = fastify({ logger: { level: 'info' } });

    // Register CORS
    app.register(cors, {
        origin: process.env.CORS_ORIGIN || '*',
        credentials: true
    });

    registerRequestLogger(app);
    registerErrorHandler(app);
    registerRoutes(app, options.routes);

    if (options.internalApiKey) {
        const authMiddleware = createAuthMiddleware(options.internalApiKey);
        app.addHook('onRequest', authMiddleware);
    }

    return app;
}
