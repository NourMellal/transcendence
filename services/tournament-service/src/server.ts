import fastify from 'fastify';
import { getEnvVarAsNumber } from '@transcendence/shared-utils';

const config = {
    PORT: getEnvVarAsNumber('TOURNAMENT_SERVICE_PORT', 3004)
};

async function createApp() {
    const app = fastify({
        logger: { level: 'info' }
    });

    // Health check
    app.get('/health', async () => {
        return {
            status: 'ok',
            service: 'tournament-service',
            timestamp: new Date().toISOString()
        };
    });

    // Placeholder routes
    app.get('/api/tournaments', async () => {
        return { message: 'Tournament service - list tournaments endpoint' };
    });

    app.post('/api/tournaments', async () => {
        return { message: 'Tournament service - create tournament endpoint' };
    });

    return app;
}

async function start() {
    try {
        const app = await createApp();
        await app.listen({ port: config.PORT, host: '0.0.0.0' });
        console.log(`🏆 Tournament Service running on port ${config.PORT}`);
    } catch (error) {
        console.error('Failed to start Tournament Service:', error);
        process.exit(1);
    }
}

start();
