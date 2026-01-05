import fastify, { FastifyInstance } from 'fastify';
import { createAuthMiddleware } from './middleware/authMiddleware';
import { registerErrorHandler } from './middleware/errorHandler';
import { registerRequestLogger } from './middleware/requestLogger';
import { registerRoutes, HttpRoutesDeps } from './routes';

interface CreateHttpServerOptions {
    readonly routes: HttpRoutesDeps;
    readonly internalApiKey?: string;
    readonly logger?: unknown;
}

export function createHttpServer(options: CreateHttpServerOptions): FastifyInstance {
    const app = fastify({ logger: options.logger ?? { level: 'info' } });

    registerRequestLogger(app);
    registerErrorHandler(app);
    registerRoutes(app, options.routes);

    if (options.internalApiKey) {
        const authMiddleware = createAuthMiddleware(options.internalApiKey);
        app.addHook('onRequest', authMiddleware);
    }

    return app;
}
