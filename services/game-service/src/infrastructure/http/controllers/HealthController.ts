import { FastifyInstance } from 'fastify';

export class HealthController {
    register(app: FastifyInstance): void {
        app.get('/health', async () => ({
            status: 'ok',
            service: 'game-service',
            timestamp: new Date().toISOString()
        }));
    }
}
