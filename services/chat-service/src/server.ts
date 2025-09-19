import fastify from 'fastify';
import { getEnvVarAsNumber } from '@transcendence/shared-utils';

const config = {
    PORT: getEnvVarAsNumber('CHAT_SERVICE_PORT', 3003)
};

async function createApp() {
    const app = fastify({
        logger: { level: 'info' }
    });

    // Health check
    app.get('/health', async () => {
        return {
            status: 'ok',
            service: 'chat-service',
            timestamp: new Date().toISOString()
        };
    });

    // Placeholder routes
    app.get('/api/chat/rooms', async () => {
        return { message: 'Chat service - list rooms endpoint' };
    });

    app.post('/api/chat/messages', async () => {
        return { message: 'Chat service - send message endpoint' };
    });

    return app;
}

async function start() {
    try {
        const app = await createApp();
        await app.listen({ port: config.PORT, host: '0.0.0.0' });
        console.log(`💬 Chat Service running on port ${config.PORT}`);
    } catch (error) {
        console.error('Failed to start Chat Service:', error);
        process.exit(1);
    }
}

start();
