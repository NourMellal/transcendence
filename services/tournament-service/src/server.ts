import dotenv from 'dotenv';
import { join } from 'path';

// Load only the tournament-service .env (avoid pulling repo-root defaults here)
dotenv.config({ path: join(__dirname, '../.env') });

import fastify from 'fastify';
import { getEnvVarAsNumber, createTournamentServiceVault } from '@transcendence/shared-utils';
import { createLogger } from '@transcendence/shared-logging';
import { createDatabaseConnection, runMigrations } from './infrastructure/database';

interface TournamentServiceConfig {
    PORT: number;
    HOST: string;
    DB_PATH: string;
    MAX_PARTICIPANTS: number;
    MIN_PARTICIPANTS: number;
    AUTO_START_TIMEOUT_SECONDS: number;
    vault: unknown;
}

// Load configuration with Vault integration
async function loadConfiguration(): Promise<TournamentServiceConfig> {
    const defaults = {
        PORT: getEnvVarAsNumber('TOURNAMENT_SERVICE_PORT', 3004),
        HOST: process.env.TOURNAMENT_SERVICE_HOST || '0.0.0.0',
        DB_PATH: process.env.TOURNAMENT_DB_PATH || './tournament-service.db',
        MAX_PARTICIPANTS: 8,
        MIN_PARTICIPANTS: 4,
        AUTO_START_TIMEOUT_SECONDS: 300
    };

    try {
        const vault = createTournamentServiceVault();
        await vault.initialize();

        const tournamentConfig = await vault.getServiceConfig();
        return {
            ...defaults,
            MAX_PARTICIPANTS: tournamentConfig.maxTournamentSize || defaults.MAX_PARTICIPANTS,
            MIN_PARTICIPANTS: tournamentConfig.minParticipants || defaults.MIN_PARTICIPANTS,
            AUTO_START_TIMEOUT_SECONDS: tournamentConfig.startTimeoutSeconds || defaults.AUTO_START_TIMEOUT_SECONDS,
            vault
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn('Vault not available, using environment variables:', errorMessage);

        return {
            ...defaults,
            vault: null
        };
    }
}

async function createApp() {
    const config = await loadConfiguration();

    const logger = createLogger('tournament-service', {
        pretty: process.env.LOG_PRETTY === 'true'
    });

    const db = await createDatabaseConnection(config.DB_PATH);
    await runMigrations(db);

    const app = fastify({
        logger
    });

    app.decorate('db', db);
    app.addHook('onClose', async () => {
        await db.close();
    });

    // Log configuration status
    if (config.vault) {
        app.log.info('Tournament service initialized with Vault integration');
        app.log.info('Using tournament configuration from Vault');
    } else {
        app.log.warn('Tournament service using environment variables (Vault unavailable)');
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
        return { tournaments: [] };
    });

    app.post('/api/tournaments', async () => {
        return { message: 'Tournament service create endpoint not yet implemented' };
    });

    return { app, config, db };
}

async function start() {
    if (process.env.TOURNAMENT_SERVICE_DISABLED === 'true') {
        console.log('Tournament Service disabled via TOURNAMENT_SERVICE_DISABLED=true (skip listen)');
        return;
    }

    try {
        const { app, config } = await createApp();
        await app.listen({ port: config.PORT, host: config.HOST });
        console.log(`Tournament Service running on port ${config.PORT}`);
    } catch (error) {
        const err = error as NodeJS.ErrnoException;
        if (err?.code === 'EACCES' || err?.code === 'EPERM') {
            console.warn(
                'Tournament Service could not bind to the requested port/host (permission denied). ' +
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
