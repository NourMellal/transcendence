import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load only the tournament-service .env (avoid pulling repo-root defaults here)
dotenv.config({ path: join(__dirname, '../.env') });

import fastify from 'fastify';
import { getEnvVarAsNumber, createTournamentServiceVault } from '@transcendence/shared-utils';
import { createLogger } from '@transcendence/shared-logging';

// Load configuration with Vault integration
async function loadConfiguration() {
    try {
        const vault = createTournamentServiceVault();
        await vault.initialize();

        // Get tournament-specific configuration from Vault
        const tournamentConfig = await vault.getServiceConfig();

        // Note: Tournament service uses SQLite per architecture diagram
        // The getDatabaseConfig() returns Postgres-style config, so we use env vars for DB path
        const dbConfig = await vault.getDatabaseConfig();

        return {
            PORT: getEnvVarAsNumber('TOURNAMENT_SERVICE_PORT', 3004),
            HOST: process.env.TOURNAMENT_SERVICE_HOST || '0.0.0.0',
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
            HOST: process.env.TOURNAMENT_SERVICE_HOST || '0.0.0.0',
            vault: null
        };
    }
}

async function createApp() {
    // Load configuration with Vault integration
    const config = await loadConfiguration();

    const logger = createLogger('tournament-service', {
        pretty: process.env.LOG_PRETTY === 'true'
    });

    const app = fastify({
        logger
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
    if (process.env.TOURNAMENT_SERVICE_DISABLED === 'true') {
        console.log('🏁 Tournament Service disabled via TOURNAMENT_SERVICE_DISABLED=true (skip listen)');
        return;
    }

    try {
        const { app, config } = await createApp();
        await app.listen({ port: config.PORT, host: (config as any).HOST || '0.0.0.0' });
        console.log(`🏆 Tournament Service running on port ${config.PORT}`);
    } catch (error) {
        const err = error as NodeJS.ErrnoException;
        if (err?.code === 'EACCES' || err?.code === 'EPERM') {
            console.warn(
                '⚠️  Tournament Service could not bind to the requested port/host (permission denied). ' +
                'If you are in a restricted environment, set TOURNAMENT_SERVICE_DISABLED=true to skip starting it, ' +
                'or run the stack via Docker where the service can bind normally.'
            );
            return;
        }
        console.error('Failed to start Tournament Service:', error);
        process.exit(1);
    }
}

start();
