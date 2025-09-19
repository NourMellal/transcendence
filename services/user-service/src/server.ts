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
import { getEnvVar, getEnvVarAsNumber } from '@transcendence/shared-utils';

// Environment configuration
const config = {
    PORT: getEnvVarAsNumber('USER_SERVICE_PORT', 3001),
    DB_PATH: getEnvVar('USER_SERVICE_DB_PATH', './user-service.db'),
    UPLOAD_DIR: getEnvVar('UPLOAD_DIR', './uploads'),
    LOG_LEVEL: getEnvVar('LOG_LEVEL', 'info')
};

async function createApp() {
    // Initialize Fastify
    const app = fastify({
        logger: {
            level: config.LOG_LEVEL
        }
    });

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

    // Initialize controllers
    const userController = new UserController(
        getUserUseCase,
        updateProfileUseCase,
        generate2FAUseCase
    );

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

    return app;
}

async function start() {
    try {
        const app = await createApp();

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
