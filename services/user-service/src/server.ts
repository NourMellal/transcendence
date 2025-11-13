import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env from project root BEFORE any other imports
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../../.env') });

import Fastify from 'fastify';
import cors from '@fastify/cors';
import { SQLiteUserRepository } from './infrastructure/database/repositories/sqlite-user.repository.js';
import { SQLiteFriendshipRepository } from './infrastructure/database/repositories/sqlite-friendship.repository.js';
import { SignupUseCase } from './application/use-cases/signup.usecase.js';
import { LoginUseCase } from './application/use-cases/login.usecase.js';
import { LogoutUseCase } from './application/use-cases/logout.usecase.js';
import { UpdateProfileUseCase } from './application/use-cases/update-profile.usecase.js';
import { GetUserUseCase } from './application/use-cases/get-user.usecase.js';
import { Generate2FAUseCaseImpl } from './application/use-cases/generate-2fa.usecase.js';
import { Enable2FAUseCaseImpl } from './application/use-cases/enable-2fa.usecase.js';
import { Disable2FAUseCaseImpl } from './application/use-cases/disable-2fa.usecase.js';
import { OAuth42LoginUseCaseImpl } from './application/use-cases/oauth42-login.usecase.js';
import { OAuth42CallbackUseCaseImpl } from './application/use-cases/oauth42-callback.usecase.js';
import { OAuthStateManager } from './application/services/oauth-state.manager.js';
import { SendFriendRequestUseCaseImpl } from './application/use-cases/friends/send-friend-request.usecase.js';
import { AcceptFriendRequestUseCaseImpl } from './application/use-cases/friends/accept-friend-request.usecase.js';
import { DeclineFriendRequestUseCaseImpl } from './application/use-cases/friends/decline-friend-request.usecase.js';
import { RemoveFriendUseCaseImpl } from './application/use-cases/friends/remove-friend.usecase.js';
import { GetFriendsListUseCaseImpl } from './application/use-cases/friends/get-friends-list.usecase.js';
import { GetPendingFriendRequestsUseCaseImpl } from './application/use-cases/friends/get-pending-requests.usecase.js';
import { GetSentFriendRequestsUseCaseImpl } from './application/use-cases/friends/get-sent-requests.usecase.js';
import { SearchUsersUseCaseImpl } from './application/use-cases/friends/search-users.usecase.js';
import { AuthController } from './infrastructure/http/controllers/auth.controller.js';
import { UserController } from './infrastructure/http/controllers/user.controller.js';
import { FriendsController } from './infrastructure/http/controllers/friends.controller.js';
import { registerAuthRoutes } from './infrastructure/http/routes/auth.routes.js';
import { registerUserRoutes } from './infrastructure/http/routes/user.routes.js';
import { registerFriendsRoutes } from './infrastructure/http/routes/friends.routes.js';
import { initializeJWTService } from './infrastructure/services/jwt.service.js';
import { createTwoFAService } from './infrastructure/services/two-fa.service.js';
import { createOAuth42Service } from './infrastructure/services/oauth42.service.js';

const PORT = parseInt(process.env.USER_SERVICE_PORT || '3001');
const HOST = process.env.USER_SERVICE_HOST || '0.0.0.0';
const DB_PATH = process.env.DB_PATH || './data/users.db';

async function main() {
    // Initialize Vault JWT Service
    const jwtService = await initializeJWTService();
    const oauth42Service = createOAuth42Service();
    await oauth42Service.initialize();
    const oauthStateManager = new OAuthStateManager();
    const twoFAService = createTwoFAService();

    // Initialize database
    const userRepository = new SQLiteUserRepository();
    await userRepository.initialize(DB_PATH);
    
    const friendshipRepository = new SQLiteFriendshipRepository();
    await friendshipRepository.initialize(DB_PATH);

    // Initialize use cases with Vault JWT Service
    const signupUseCase = new SignupUseCase(userRepository);
    const loginUseCase = new LoginUseCase(userRepository, jwtService, twoFAService);
    const logoutUseCase = new LogoutUseCase(userRepository);
    const updateProfileUseCase = new UpdateProfileUseCase(userRepository);
    const getUserUseCase = new GetUserUseCase(userRepository);
    const generate2FAUseCase = new Generate2FAUseCaseImpl(userRepository, twoFAService);
    const enable2FAUseCase = new Enable2FAUseCaseImpl(userRepository, twoFAService);
    const disable2FAUseCase = new Disable2FAUseCaseImpl(userRepository, twoFAService);
    const oauth42LoginUseCase = new OAuth42LoginUseCaseImpl(oauth42Service, oauthStateManager);
    const oauth42CallbackUseCase = new OAuth42CallbackUseCaseImpl(
        oauth42Service,
        userRepository,
        jwtService,
        oauthStateManager
    );

    // Initialize friends use cases
    const sendFriendRequestUseCase = new SendFriendRequestUseCaseImpl(friendshipRepository, userRepository);
    const acceptFriendRequestUseCase = new AcceptFriendRequestUseCaseImpl(friendshipRepository);
    const declineFriendRequestUseCase = new DeclineFriendRequestUseCaseImpl(friendshipRepository);
    const removeFriendUseCase = new RemoveFriendUseCaseImpl(friendshipRepository);
    const getFriendsListUseCase = new GetFriendsListUseCaseImpl(friendshipRepository);
    const getPendingFriendRequestsUseCase = new GetPendingFriendRequestsUseCaseImpl(friendshipRepository);
    const getSentFriendRequestsUseCase = new GetSentFriendRequestsUseCaseImpl(friendshipRepository);
    const searchUsersUseCase = new SearchUsersUseCaseImpl(userRepository);

    // Initialize controllers
    const authController = new AuthController(
        signupUseCase,
        loginUseCase,
        logoutUseCase,
        getUserUseCase,
        oauth42LoginUseCase,
        oauth42CallbackUseCase,
        generate2FAUseCase,
        enable2FAUseCase,
        disable2FAUseCase
    );
    const userController = new UserController(updateProfileUseCase, getUserUseCase);
    const friendsController = new FriendsController(
        sendFriendRequestUseCase,
        acceptFriendRequestUseCase,
        declineFriendRequestUseCase,
        removeFriendUseCase,
        getFriendsListUseCase,
        getPendingFriendRequestsUseCase,
        getSentFriendRequestsUseCase,
        searchUsersUseCase
    );

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
    registerUserRoutes(fastify, userController);
    registerFriendsRoutes(fastify, friendsController);

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
