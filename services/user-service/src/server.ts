import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import { setupRoutes } from './infrastructure/routes.js';
import { AuthController } from './adapters/controllers/auth.controller.js';
import { UserController } from './adapters/controllers/user-management.controller.js';

// Use Cases (you'll need to import and initialize these)
import { OAuth42LoginUseCaseImpl } from './application/use-cases/oauth-42-login.usecase.js';
import { OAuth42CallbackUseCaseImpl } from './application/use-cases/oauth-42-callback.usecase.js';
import { AuthenticateUserUseCaseImpl } from './application/use-cases/authenticate-user.usecase.js';
import { Verify2FAUseCaseImpl } from './application/use-cases/verify-2fa.usecase.js';
// import { GetUserUseCaseImpl } from './application/use-cases/get-user.usecase.js';
// import { UpdateProfileUseCaseImpl } from './application/use-cases/update-profile.usecase.js';
import { Generate2FAUseCaseImpl } from './application/use-cases/generate-2fa.usecase.js';
import { Enable2FAUseCaseImpl } from './application/use-cases/enable-2fa.usecase.js';
import { Disable2FAUseCaseImpl } from './application/use-cases/disable-2fa.usecase.js';

// External Services
import { OAuth42Service } from './adapters/external/oauth-42.service.js';
import { JWTServiceImpl } from './adapters/external/jwt.service.js';
// import { OtpTwoFAService } from './adapters/external/otp-2fa.service.js';

// Repository
// import { SqliteUserRepository } from './adapters/persistence/sqlite-user.repository.js';
import Database from 'better-sqlite3';

// Vault client (if you have one)
import { VaultClient } from '../../../packages/shared-utils/src/vault/client';

async function startServer() {
    // 1. Create Fastify instance
    const app = Fastify({
        logger: {
            level: 'info',
            transport: {
                target: 'pino-pretty',
                options: {
                    colorize: true
                }
            }
        }
    });

    try {
        // 2. ⭐ REGISTER COOKIE PLUGIN - THIS IS CRITICAL! ⭐

        
        app.log.info('✅ Cookie plugin registered');

        // 3. Initialize Vault client (optional, for getting secrets)
        const vault = new VaultClient({
            endpoint: process.env.VAULT_ADDR || 'http://localhost:8200',
            token: process.env.VAULT_TOKEN || 'dev-root-token'
        });

        // 4. Get configuration from Vault (or use environment variables)
        let oauthConfig, jwtConfig;
        
        try {
            // Try to get from Vault
            oauthConfig = await vault.getSecret('secret/api/oauth');
            jwtConfig = await vault.getSecret('secret/jwt/auth');
            app.log.info('✅ Configuration loaded from Vault');
        } catch (error) {
            // Fallback to environment variables
            app.log.warn('⚠️  Vault unavailable, using environment variables');
            oauthConfig = {
                '42_client_id': process.env.OAUTH_42_CLIENT_ID || '',
                '42_client_secret': process.env.OAUTH_42_CLIENT_SECRET || '',
                '42_callback_url': process.env.OAUTH_42_CALLBACK_URL || 'http://localhost:3001/auth/42/callback'
            };
            jwtConfig = {
                secret_key: process.env.JWT_SECRET || 'change-me-in-production',
                issuer: 'transcendence',
                expiration_hours: '24'
            };
        }

        // 5. Initialize Database
        const db = new Database('./data/users.db');
        
        // Create tables if they don't exist
        db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                username TEXT UNIQUE NOT NULL,
                display_name TEXT,
                avatar TEXT,
                two_fa_secret TEXT,
                is_2fa_enabled BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        app.log.info('✅ Database initialized');

        // 6. Initialize Repositories
        const userRepository = new SqliteUserRepository(db);

        // 7. Initialize External Services
        const oauth42Service = new OAuth42Service(
            oauthConfig['42_client_id'],
            oauthConfig['42_client_secret'],
            oauthConfig['42_callback_url']
        );

        const jwtService = new JWTServiceImpl(
            jwtConfig.secret_key,
            jwtConfig.issuer,
            parseInt(jwtConfig.expiration_hours)
        );

        const twoFAService = new OtpTwoFAService();

        // 8. Initialize Use Cases
        const oauth42LoginUseCase = new OAuth42LoginUseCaseImpl(oauth42Service);
        
        const oauth42CallbackUseCase = new OAuth42CallbackUseCaseImpl(
            oauth42Service,
            userRepository,
            jwtService
        );

        const authenticateUserUseCase = new AuthenticateUserUseCaseImpl(
            jwtService,
            userRepository
        );

        const verify2FAUseCase = new Verify2FAUseCaseImpl(
            userRepository,
            twoFAService
        );

        const getUserUseCase = new GetUserUseCaseImpl(userRepository);
        
        const updateProfileUseCase = new UpdateProfileUseCaseImpl(userRepository);
        
        const generate2FAUseCase = new Generate2FAUseCaseImpl(
            userRepository,
            twoFAService
        );
        
        const enable2FAUseCase = new Enable2FAUseCaseImpl(
            userRepository,
            twoFAService
        );
        
        const disable2FAUseCase = new Disable2FAUseCaseImpl(
            userRepository,
            twoFAService
        );

        // 9. Initialize Controllers
        const authController = new AuthController(
            oauth42LoginUseCase,
            oauth42CallbackUseCase,
            authenticateUserUseCase,
            verify2FAUseCase
        );

        const userController = new UserController(
            getUserUseCase,
            updateProfileUseCase,
            generate2FAUseCase,
            enable2FAUseCase,
            disable2FAUseCase,
            authenticateUserUseCase
        );

        // 10. Setup Routes
        setupRoutes(app, authController, userController);
        
        app.log.info('✅ Routes registered');

        // 11. Start Server
        const port = parseInt(process.env.PORT || '3001');
        const host = process.env.HOST || '0.0.0.0';

        await app.listen({ port, host });
        
        app.log.info(`🚀 User Service running on http://${host}:${port}`);
        app.log.info(`📝 Health check: http://${host}:${port}/health`);
        app.log.info(`🔐 OAuth login: http://${host}:${port}/auth/42/login`);

    } catch (error) {
        app.log.error(error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    process.exit(0);
});

// Start the server
startServer();