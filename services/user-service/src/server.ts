import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { SQLiteUserRepository } from './infrastructure/database/repositories/sqlite-user.repository.js';
import { SignupUseCase } from './application/use-cases/signup.usecase.js';
import { LoginUseCase } from './application/use-cases/login.usecase.js';
import { AuthController } from './infrastructure/http/controllers/auth.controller.js';
import { registerAuthRoutes } from './infrastructure/http/routes/auth.routes.js';
import { initializeJWTService, getJWTService } from './infrastructure/services/jwt.service.js';

dotenv.config();

const PORT = parseInt(process.env.USER_SERVICE_PORT || '3001');
const HOST = process.env.USER_SERVICE_HOST || '0.0.0.0';
const DB_PATH = process.env.DB_PATH || './data/users.db';

async function main() {
    // Initialize Vault JWT Service
    const jwtService = await initializeJWTService();

    // Initialize database
    const userRepository = new SQLiteUserRepository();
    await userRepository.initialize(DB_PATH);

    // Initialize use cases with Vault JWT Service
    const signupUseCase = new SignupUseCase(userRepository);
    const loginUseCase = new LoginUseCase(userRepository, jwtService);

    // Initialize controllers
    const authController = new AuthController(signupUseCase, loginUseCase);

    // Initialize Fastify
    const fastify = Fastify({
        logger: {
            level: process.env.LOG_LEVEL || 'info',
            transport: {
                target: 'pino-pretty',
                options: {
                    translateTime: 'HH:MM:ss Z',
                    ignore: 'pid,hostname',
                }
            }
        }
    });

    // Register plugins
    await fastify.register(cors, {
        origin: true,
        credentials: true,
    });

    // Health check
    fastify.get('/health', async () => {
        return {
            status: 'ok',
            service: 'user-service',
            vault: jwtService.isUsingVault() ? 'connected' : 'fallback'
        };
    });

    // Register routes
    registerAuthRoutes(fastify, authController);

    // Graceful shutdown
    const shutdown = async () => {
        fastify.log.info('Shutting down...');
        await jwtService.shutdown();
        await fastify.close();
        process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    // Start server
    try {
        await fastify.listen({ port: PORT, host: HOST });
        fastify.log.info(`🚀 User Service running on http://${HOST}:${PORT}`);
        fastify.log.info(`🔐 JWT Source: ${jwtService.isUsingVault() ? 'Vault' : 'Environment Variables'}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
}

main();
