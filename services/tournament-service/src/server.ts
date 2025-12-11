import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env from project root

dotenv.config({ path: join(__dirname, '../../../.env') });

import fastify from 'fastify';
import { getEnvVarAsNumber, createTournamentServiceVault } from '@transcendence/shared-utils';

// Load configuration with Vault integration
async function loadConfiguration() {
    const vault = createTournamentServiceVault();

    try {
        await vault.initialize();

        // Get tournament-specific configuration from Vault
        const tournamentConfig = await vault.getServiceConfig();

        // Note: Tournament service uses SQLite per architecture diagram
        // The getDatabaseConfig() returns Postgres-style config, so we use env vars for DB path
        const dbConfig = await vault.getDatabaseConfig();

        return {
            PORT: getEnvVarAsNumber('TOURNAMENT_SERVICE_PORT', 3004),
            // Tournament configuration from Vault
            MAX_TOURNAMENT_SIZE: tournamentConfig.maxTournamentSize || 32,
            TOURNAMENT_TIMEOUT_HOURS: tournamentConfig.timeoutHours || 24,
            MIN_PARTICIPANTS: tournamentConfig.minParticipants || 4,
            REGISTRATION_DEADLINE_HOURS: tournamentConfig.registrationDeadlineHours || 2,
            // Notification configuration
            NOTIFICATION_WEBHOOK_URL: tournamentConfig.notificationWebhookUrl,
            EMAIL_NOTIFICATIONS: tournamentConfig.emailNotifications || false,
            // Database configuration - SQLite per architecture
            DB_PATH: process.env.TOURNAMENT_DB_PATH || './tournament-service.db',
            DB_TYPE: 'sqlite',
            vault
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn('Vault not available, using environment variables:', errorMessage);

        return {
            PORT: getEnvVarAsNumber('TOURNAMENT_SERVICE_PORT', 3004),
            MAX_TOURNAMENT_SIZE: getEnvVarAsNumber('MAX_TOURNAMENT_SIZE', 32),
            TOURNAMENT_TIMEOUT_HOURS: getEnvVarAsNumber('TOURNAMENT_TIMEOUT_HOURS', 24),
            MIN_PARTICIPANTS: getEnvVarAsNumber('MIN_PARTICIPANTS', 4),
            REGISTRATION_DEADLINE_HOURS: getEnvVarAsNumber('REGISTRATION_DEADLINE_HOURS', 2),
            NOTIFICATION_WEBHOOK_URL: process.env.NOTIFICATION_WEBHOOK_URL,
            EMAIL_NOTIFICATIONS: process.env.EMAIL_NOTIFICATIONS === 'true',
            DB_PATH: process.env.TOURNAMENT_DB_PATH || './tournament-service.db',
            DB_TYPE: 'sqlite',
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
        app.log.info('✅ Tournament service initialized with Vault integration');
        app.log.info('🏆 Using tournament configuration from Vault');
    } else {
        app.log.warn('⚠️ Tournament service using environment variables (Vault unavailable)');
    }

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

    return { app, config };
}

async function start() {
    try {
        const { app, config } = await createApp();
        await app.listen({ port: config.PORT, host: '0.0.0.0' });
        console.log(`🏆 Tournament Service running on port ${config.PORT}`);
    } catch (error) {
        console.error('Failed to start Tournament Service:', error);
        process.exit(1);
    }
}

start();
