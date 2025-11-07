import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../../.env') });

import fastify from 'fastify';
import { getEnvVarAsNumber, createGameServiceVault } from '@transcendence/shared-utils';

// Load configuration with Vault integration
async function loadConfiguration() {
    const vault = createGameServiceVault();

    try {
        await vault.initialize();

        // Get game-specific configuration from Vault
        const gameConfig = await vault.getServiceConfig();
        const redisConfig = await vault.getDatabaseConfig(); // Redis config stored in database section

        return {
            PORT: getEnvVarAsNumber('GAME_SERVICE_PORT', 3002),
            // Game configuration from Vault
            GAME_ROOM_CAPACITY: gameConfig.roomCapacity || 2,
            GAME_TIMEOUT_MINUTES: gameConfig.timeoutMinutes || 30,
            SCORE_LIMIT: gameConfig.scoreLimit || 11,
            BALL_SPEED: gameConfig.ballSpeed || 5,
            PADDLE_SPEED: gameConfig.paddleSpeed || 8,
            // Redis configuration from Vault (stored in database config)
            REDIS_HOST: redisConfig.host || 'localhost',
            REDIS_PORT: redisConfig.port || 6379,
            REDIS_PASSWORD: redisConfig.password,
            vault
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn('Vault not available, using environment variables:', errorMessage);

        return {
            PORT: getEnvVarAsNumber('GAME_SERVICE_PORT', 3002),
            GAME_ROOM_CAPACITY: getEnvVarAsNumber('GAME_ROOM_CAPACITY', 2),
            GAME_TIMEOUT_MINUTES: getEnvVarAsNumber('GAME_TIMEOUT_MINUTES', 30),
            SCORE_LIMIT: getEnvVarAsNumber('SCORE_LIMIT', 11),
            BALL_SPEED: getEnvVarAsNumber('BALL_SPEED', 5),
            PADDLE_SPEED: getEnvVarAsNumber('PADDLE_SPEED', 8),
            REDIS_HOST: process.env.REDIS_HOST || 'localhost',
            REDIS_PORT: getEnvVarAsNumber('REDIS_PORT', 6379),
            REDIS_PASSWORD: process.env.REDIS_PASSWORD,
            vault: null
        };
    }
}

async function createApp() {
    // Load configuration with Vault integration
    const config = await loadConfiguration();

    const app = fastify({
        logger: { level: 'info' }
    });

    // Log configuration status
    if (config.vault) {
        app.log.info('✅ Game service initialized with Vault integration');
        app.log.info('🎮 Using game configuration from Vault');
    } else {
        app.log.warn('⚠️ Game service using environment variables (Vault unavailable)');
    }

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

    return { app, config };
}

async function start() {
    try {
        const { app, config } = await createApp();
        await app.listen({ port: config.PORT, host: '0.0.0.0' });
        console.log(`🎮 Game Service running on port ${config.PORT}`);
    } catch (error) {
        console.error('Failed to start Game Service:', error);
        process.exit(1);
    }
}

start();
