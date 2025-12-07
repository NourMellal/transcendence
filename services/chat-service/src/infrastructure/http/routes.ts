import { FastifyInstance } from 'fastify';
import { ChatController } from './controllers/chat.contoller';
import { HealthController } from './controllers/health.controller';

export interface HttpRoutesDeps {
    readonly chatController: ChatController;
    readonly healthController: HealthController;
}

export function registerRoutes(app: FastifyInstance, deps: HttpRoutesDeps): void {
    deps.healthController.register(app);
    deps.chatController.register(app);
}
