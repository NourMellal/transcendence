import fastify from 'fastify';
import { getEnvVarAsNumber } from '@transcendence/shared-utils';

const config = {
    PORT: getEnvVarAsNumber('GAME_SERVICE_PORT', 3002)
};

async function createApp() {
    const app = fastify({
        logger: { level: 'info' }
    });

    // Health check
    app.get('/health', async () => {
        return {
            status: 'ok',
            service: 'game-service',
            timestamp: new Date().toISOString()
        };
    });

    // Placeholder routes
    app.get('/api/games', async () => {
        return { message: 'Game service - list games endpoint' };
    });

    app.post('/api/games', async () => {
        return { message: 'Game service - create game endpoint' };
    });

    return app;
}

async function start() {
    try {
        const app = await createApp();
        await app.listen({ port: config.PORT, host: '0.0.0.0' });
        console.log(`🎮 Game Service running on port ${config.PORT}`);
    } catch (error) {
        console.error('Failed to start Game Service:', error);
        process.exit(1);
    }
}

start();
