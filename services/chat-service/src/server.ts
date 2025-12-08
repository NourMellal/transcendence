import { createHttpServer } from './infrastructure/http/server';
import { loadChatServiceConfig, logger } from './infrastructure/config';
import { createContainer } from './dependency-injection/container';
export async function startChatService(): Promise<void> {    
    try {
        logger.info('🚀 Starting Chat Service...');
        const config = await loadChatServiceConfig();
        const container = await createContainer(config); 

        // HTTP Server ONLY (no WebSocket/messaging yet)
        const app = createHttpServer({
            routes: {
                chatController: container.controllers.chatController,
                healthController: container.controllers.healthController
            },
            internalApiKey: config.internalApiKey
        });
        console.log("database Out if we reached here ")   
        const shutdown = async () => {
            logger.info('🛑 Shutting down Chat Service...');
            await app.close();
            process.exit(0);
        };

        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);

        await app.listen({ port: config.port, host: '0.0.0.0' });
        logger.info(`💬 Chat Service running on port ${config.port}`);

    } catch (error) {
        logger.error(error, 'Failed to start Chat Service');
        process.exit(1);
    }
}

startChatService() ;   