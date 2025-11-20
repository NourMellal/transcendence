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
            internalApiKey: config.internalApiKey
        });

        const websocketServer = new GameWebSocketServer(app.server, {
            roomManager: container.websocket.roomManager,
            connectionHandler: container.websocket.connectionHandler,
            paddleMoveHandler: container.websocket.paddleMoveHandler,
            disconnectHandler: container.websocket.disconnectHandler
        });

        await app.listen({ port: config.port, host: '0.0.0.0' });
        logger.info(`🎮 Game Service running on port ${config.port}`);

        // Keep reference to avoid tree shaking
        void websocketServer;
    } catch (error) {
        logger.error(error, 'Failed to start Game Service');
        process.exit(1);
    }
}
