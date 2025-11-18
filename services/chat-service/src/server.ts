import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env from project root
dotenv.config({ path: join(__dirname, '../../../.env') });

import fastify from 'fastify';
import { getEnvVarAsNumber, createChatServiceVault } from '@transcendence/shared-utils';

// Load configuration with Vault integration
async function loadConfiguration() {
    const vault = createChatServiceVault();

    try {
        await vault.initialize();

        // Get chat-specific configuration from Vault
        const chatConfig = await vault.getServiceConfig();
        const redisConfig = await vault.getDatabaseConfig();

        return {
            PORT: getEnvVarAsNumber('CHAT_SERVICE_PORT', 3003),
            // Chat configuration from Vault
            MAX_MESSAGE_LENGTH: chatConfig.maxMessageLength || 1000,
            RATE_LIMIT_MESSAGES: chatConfig.rateLimitMessages || 60,
            ROOM_CAPACITY: chatConfig.roomCapacity || 100,
            MESSAGE_HISTORY_LIMIT: chatConfig.messageHistoryLimit || 50,
            // WebSocket configuration
            WS_PING_INTERVAL: chatConfig.wsPingInterval || 30000,
            WS_TIMEOUT: chatConfig.wsTimeout || 60000,
            // Redis configuration from Vault
            REDIS_HOST: redisConfig.host || 'localhost',
            REDIS_PORT: redisConfig.port || 6379,
            REDIS_PASSWORD: redisConfig.password,
            vault
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn('Vault not available, using environment variables:', errorMessage);

        return {
            PORT: getEnvVarAsNumber('CHAT_SERVICE_PORT', 3003),
            MAX_MESSAGE_LENGTH: getEnvVarAsNumber('MAX_MESSAGE_LENGTH', 1000),
            RATE_LIMIT_MESSAGES: getEnvVarAsNumber('RATE_LIMIT_MESSAGES', 60),
            ROOM_CAPACITY: getEnvVarAsNumber('ROOM_CAPACITY', 100),
            MESSAGE_HISTORY_LIMIT: getEnvVarAsNumber('MESSAGE_HISTORY_LIMIT', 50),
            WS_PING_INTERVAL: getEnvVarAsNumber('WS_PING_INTERVAL', 30000),
            WS_TIMEOUT: getEnvVarAsNumber('WS_TIMEOUT', 60000),
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
        app.log.info('✅ Chat service initialized with Vault integration');
        app.log.info('💬 Using chat configuration from Vault');
    } else {
        app.log.warn('⚠️ Chat service using environment variables (Vault unavailable)');
    }

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

    return { app, config };
}

async function start() {
    try {
        const { app, config } = await createApp();
        await app.listen({ port: config.PORT, host: '0.0.0.0' });
        console.log(`💬 Chat Service running on port ${config.PORT}`);
    } catch (error) {
        console.error('Failed to start Chat Service:', error);
        process.exit(1);
    }
}

start();
