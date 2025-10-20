import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../../.env') });

import fastify from 'fastify';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import { SqliteUserRepository } from './adapters/persistence/sqlite-user.repository.js';
import { OtpTwoFAService } from './adapters/external/otp-2fa.service.js';
import { LocalImageStorageService } from './adapters/external/local-image-storage.service.js';
import { GetUserUseCaseImpl } from './application/get-user.usecase.js';
import { UpdateProfileUseCaseImpl } from './application/update-profile.usecase.js';
import { Generate2FAUseCaseImpl } from './application/generate-2fa.usecase.js';
import { UserController } from './adapters/web/user.controller.js';
import { getEnvVar, getEnvVarAsNumber, createUserServiceVault } from '@transcendence/shared-utils';

// Environment configuration
async function loadConfiguration() {
    // Initialize Vault for secure configuration
    const vault = createUserServiceVault();

    try {
        await vault.initialize();

        // Get database configuration from Vault
        const dbConfig = await vault.getDatabaseConfig();
        const jwtConfig = await vault.getJWTConfig();

        return {
            PORT: getEnvVarAsNumber('USER_SERVICE_PORT', 3001),
            // Database configuration from Vault with fallback
            DB_PATH: dbConfig.host || getEnvVar('USER_SERVICE_DB_PATH', './user-service.db'),
            DB_HOST: dbConfig.host,
            DB_PORT: dbConfig.port,
            DB_NAME: dbConfig.database,
            DB_USER: dbConfig.username,
            DB_PASSWORD: dbConfig.password,
            DB_SSL: dbConfig.ssl,
            // JWT configuration from Vault
            JWT_SECRET: jwtConfig.secretKey,
            JWT_ISSUER: jwtConfig.issuer,
            JWT_EXPIRATION_HOURS: jwtConfig.expirationHours,
            // Other configuration
            UPLOAD_DIR: getEnvVar('UPLOAD_DIR', './uploads'),
            LOG_LEVEL: getEnvVar('LOG_LEVEL', 'info'),
            // Vault helper for runtime secret access
            vault
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn('Vault not available, using environment variables:', errorMessage);

        // Fallback to environment variables
        return {
            PORT: getEnvVarAsNumber('USER_SERVICE_PORT', 3001),
            DB_PATH: getEnvVar('USER_SERVICE_DB_PATH', './user-service.db'),
            DB_HOST: getEnvVar('DB_HOST'),
            DB_PORT: getEnvVarAsNumber('DB_PORT', 5432),
            DB_NAME: getEnvVar('DB_NAME', 'transcendence'),
            DB_USER: getEnvVar('DB_USER', 'transcendence'),
            DB_PASSWORD: getEnvVar('DB_PASSWORD'),
            DB_SSL: getEnvVar('DB_SSL', 'false') === 'true',
            JWT_SECRET: getEnvVar('JWT_SECRET'),
            JWT_ISSUER: getEnvVar('JWT_ISSUER', 'transcendence'),
            JWT_EXPIRATION_HOURS: getEnvVarAsNumber('JWT_EXPIRATION_HOURS', 24),
            UPLOAD_DIR: getEnvVar('UPLOAD_DIR', './uploads'),
            LOG_LEVEL: getEnvVar('LOG_LEVEL', 'info'),
            vault: null
        };
    }
}

async function createApp() {
    // Load configuration with Vault integration
    const config = await loadConfiguration();

    // Initialize Fastify
    const app = fastify({
        logger: {
            level: config.LOG_LEVEL
        }
    });

    // Log configuration status
    if (config.vault) {
        app.log.info('✅ User service initialized with Vault integration');
        app.log.info('🔐 Using secrets from Vault for enhanced security');
    } else {
        app.log.warn('⚠️ User service using environment variables (Vault unavailable)');
    }

    // Initialize database
    const db = await open({
        filename: config.DB_PATH,
        driver: sqlite3.Database
    });

    // Initialize repositories
    const userRepository = new SqliteUserRepository(db);

    // Initialize external services
    const twoFAService = new OtpTwoFAService();
    const imageStorageService = new LocalImageStorageService(config.UPLOAD_DIR);

    // Initialize use cases
    const getUserUseCase = new GetUserUseCaseImpl(userRepository);
    const updateProfileUseCase = new UpdateProfileUseCaseImpl(userRepository, imageStorageService);
    const generate2FAUseCase = new Generate2FAUseCaseImpl(userRepository, twoFAService);

    // Initialize controllers with Vault access for runtime secrets
    const userController = new UserController(
        getUserUseCase,
        updateProfileUseCase,
        generate2FAUseCase
    );

    // Add Vault helper to app context for accessing runtime secrets
    if (config.vault) {
        app.decorate('vault', config.vault);
        app.decorate('getOAuthCredentials', async () => {
            return await config.vault.getAPIConfig();
        });
        app.decorate('refreshJWTConfig', async () => {
            return await config.vault.getJWTConfig();
        });
    }

    // Register plugins
    await app.register(import('@fastify/multipart'), {
        limits: {
            fileSize: 5 * 1024 * 1024 // 5MB
        }
    });

    // Register routes
    await app.register(async function (fastify) {
        await userController.registerRoutes(fastify);
    }, { prefix: '/api/users' });

    // Health check
    app.get('/health', async () => {
        return { status: 'ok', service: 'user-service', timestamp: new Date().toISOString() };
    });

    // Error handler
    app.setErrorHandler((error, request, reply) => {
        app.log.error(error);
        reply.status(500).send({
            success: false,
            error: 'Internal Server Error'
        });
    });

    return { app, config };
}

async function start() {
    try {
        const { app, config } = await createApp();

        await app.listen({
            port: config.PORT,
            host: '0.0.0.0'
        });

        console.log(`🚀 User Service running on port ${config.PORT}`);
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});

start();
