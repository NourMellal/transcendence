import { FastifyInstance } from 'fastify';
import { ChatController } from './controllers/chat.contoller';
import { HealthController } from './controllers/health.controller';
import { createAuthMiddleware } from './middlewares/auth.middleware';

export interface HttpRoutesDeps {
    readonly chatController: ChatController;
    readonly healthController: HealthController;
}

export function registerRoutes(app: FastifyInstance, deps: HttpRoutesDeps): void {
    // Health check at root
    deps.healthController.register(app);
    
    // Chat routes under /chat prefix to match API Gateway expectations
    // Apply JWT authentication middleware to all chat routes
    app.register(async (chatApp) => {
        chatApp.addHook('preHandler', createAuthMiddleware);
        deps.chatController.register(chatApp);
    }, { prefix: '/chat' });
}
