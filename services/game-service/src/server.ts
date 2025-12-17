import { createHttpServer } from './infrastructure/http/server';
import { GameWebSocketServer } from './infrastructure/websocket';
import { createContainer } from './dependency-injection';
import { loadGameServiceConfig, logger } from './infrastructure/config';

export async function startGameService(): Promise<void> {
    try {
        const config = await loadGameServiceConfig();
        const container = await createContainer(config);

        const app = createHttpServer({
            routes: {
                gameController: container.controllers.gameController,
                healthController: container.controllers.healthController
            },
            internalApiKey: config.internalApiKey,
            logger
        });

        const websocketServer = new GameWebSocketServer(app.server, {
            roomManager: container.websocket.roomManager,
            connectionHandler: container.websocket.connectionHandler,
            paddleMoveHandler: container.websocket.paddleMoveHandler,
            disconnectHandler: container.websocket.disconnectHandler,
            paddleSetHandler: container.websocket.paddleSetHandler,
            authService: container.websocket.authService
        });

        container.useCases.updateGameState.setBroadcaster(websocketServer);

        const shutdown = async () => {
            logger.info('Shutting down Game Service...');
            await app.close();
            await container.messaging.connection.close();
            process.exit(0);
        };

        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);

        await app.listen({ port: config.port, host: '0.0.0.0' });
        logger.info(`🎮 Game Service running on port ${config.port}`);

        // Keep reference to avoid tree shaking
        void websocketServer;
    } catch (error) {
        logger.error(error, 'Failed to start Game Service');
        process.exit(1);
    }
}
