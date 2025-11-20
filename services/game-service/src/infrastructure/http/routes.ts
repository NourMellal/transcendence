import { FastifyInstance } from 'fastify';
import { GameController } from './controllers/GameController';
import { HealthController } from './controllers/HealthController';

export interface HttpRoutesDeps {
    readonly gameController: GameController;
    readonly healthController: HealthController;
}

export function registerRoutes(app: FastifyInstance, deps: HttpRoutesDeps): void {
    deps.healthController.register(app);
    deps.gameController.register(app);
}
