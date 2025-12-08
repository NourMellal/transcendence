import dotenv from 'dotenv';
import { join } from 'path';

// Load .env from project root BEFORE any other imports
dotenv.config({ path: join(__dirname, '../../../.env') });

import Fastify from 'fastify';
import cors from '@fastify/cors';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { SQLiteUserRepository } from './infrastructure/database/repositories/sqlite-user.repository';
import { SQLiteFriendshipRepository } from './infrastructure/database/repositories/sqlite-friendship.repository';
import { SQLiteSessionRepository } from './infrastructure/database/repositories/sqlite-session.repository';
import { SQLitePresenceRepository } from './infrastructure/database/repositories/sqlite-presence.repository';
import { SignupUseCase } from './application/use-cases/auth/signup.usecase';
import { LoginUseCase } from './application/use-cases/auth/login.usecase';
import { LogoutUseCase } from './application/use-cases/auth/logout.usecase';
import { RefreshTokenUseCase } from './application/use-cases/auth/refresh-token.usecase';
import { UpdateProfileUseCase } from './application/use-cases/users/update-profile.usecase';
import { GetUserUseCase } from './application/use-cases/users/get-user.usecase';
import { DeleteUserUseCase } from './application/use-cases/users/delete-user.usecase';
import { Generate2FAUseCaseImpl } from './application/use-cases/two-fa/generate-2fa.usecase';
import { Enable2FAUseCaseImpl } from './application/use-cases/two-fa/enable-2fa.usecase';
import { Disable2FAUseCaseImpl } from './application/use-cases/two-fa/disable-2fa.usecase';
import { OAuth42LoginUseCaseImpl } from './application/use-cases/auth/oauth42-login.usecase';
import { OAuth42CallbackUseCaseImpl } from './application/use-cases/auth/oauth42-callback.usecase';
import { OAuthStateManager } from './application/services/oauth-state.manager';
import { AuthController } from './infrastructure/http/controllers/auth.controller';
import { UserController } from './infrastructure/http/controllers/user.controller';
import { registerAuthRoutes } from './infrastructure/http/routes/auth.routes';
import { registerUserRoutes } from './infrastructure/http/routes/user.routes';
import { registerFriendRoutes } from './infrastructure/http/routes/friend.routes';
import { registerPresenceRoutes } from './infrastructure/http/routes/presence.routes';
import { initializeJWTService } from './infrastructure/services/jwt.service';
import { createTwoFAService } from './infrastructure/services/two-fa.service';
import { createOAuth42Service } from './infrastructure/services/oauth42.service';
import { SendFriendRequestUseCase } from './application/use-cases/friends/send-friend-request.usecase';
import { RespondFriendRequestUseCase } from './application/use-cases/friends/respond-friend-request.usecase';
import { ListFriendsUseCase } from './application/use-cases/friends/list-friends.usecase';
import { BlockUserUseCase } from './application/use-cases/friends/block-user.usecase';
import { RemoveFriendUseCase } from './application/use-cases/friends/remove-friend.usecase';
import { UnblockUserUseCase } from './application/use-cases/friends/unblock-user.usecase';
import { CancelFriendRequestUseCase } from './application/use-cases/friends/cancel-friend-request.usecase';
import { UpdatePresenceUseCase } from './application/use-cases/presence/update-presence.usecase';
import { GetPresenceUseCase } from './application/use-cases/presence/get-presence.usecase';
import { PresenceController } from './infrastructure/http/controllers/presence.controller';
import { FriendController } from './infrastructure/http/controllers/friend.controller';
import { SQLiteUnitOfWork } from './infrastructure/database/sqlite-unit-of-work';
import { PasswordHasherAdapter } from './infrastructure/adapters/security/password-hasher.adapter';
import { createMessagingConfig } from './infrastructure/messaging/config/messaging.config';
import { RabbitMQConnection } from './infrastructure/messaging/RabbitMQConnection';
import { EventSerializer } from './infrastructure/messaging/serialization/EventSerializer';
import { RabbitMQUserEventsPublisher } from './infrastructure/messaging/RabbitMQPublisher';

const PORT = parseInt(process.env.USER_SERVICE_PORT || '3001');
const HOST = process.env.USER_SERVICE_HOST || '0.0.0.0';
const DB_PATH = process.env.DB_PATH || join(__dirname, '../data/users.db');

async function main() {
    // Initialize Vault JWT Service
    const jwtService = await initializeJWTService();
    const oauth42Service = createOAuth42Service();
    await oauth42Service.initialize();
    const oauthStateManager = new OAuthStateManager();
    const twoFAService = createTwoFAService();
    const passwordHasher = new PasswordHasherAdapter();
    const messagingConfig = createMessagingConfig();
    const messagingConnection = new RabbitMQConnection({
        uri: messagingConfig.uri,
        exchange: messagingConfig.exchange,
    });
    const eventSerializer = new EventSerializer();
    const userEventsPublisher = new RabbitMQUserEventsPublisher(
        messagingConnection,
        eventSerializer,
        messagingConfig.exchange
    );

    // Initialize shared database connection
    const db = await open({
        filename: DB_PATH,
        driver: sqlite3.Database,
    });

    const userRepository = new SQLiteUserRepository();
    await userRepository.initialize(DB_PATH, db);
    const friendshipRepository = new SQLiteFriendshipRepository();
    await friendshipRepository.initialize(DB_PATH, db);
    const sessionRepository = new SQLiteSessionRepository();
    await sessionRepository.initialize(DB_PATH, db);
    const presenceRepository = new SQLitePresenceRepository();
    await presenceRepository.initialize(DB_PATH, db);
    const unitOfWork = new SQLiteUnitOfWork(db);

    // Initialize use cases with Vault JWT Service
    const signupUseCase = new SignupUseCase(userRepository, passwordHasher);
    const loginUseCase = new LoginUseCase(
        userRepository,
        jwtService,
        sessionRepository,
        passwordHasher,
        twoFAService,
        presenceRepository
    );
    const logoutUseCase = new LogoutUseCase(userRepository, sessionRepository, presenceRepository);
    const refreshTokenUseCase = new RefreshTokenUseCase(sessionRepository, userRepository, jwtService);
    const updateProfileUseCase = new UpdateProfileUseCase(userRepository, passwordHasher);
    const getUserUseCase = new GetUserUseCase(userRepository);
    const deleteUserUseCase = new DeleteUserUseCase(
        userRepository,
        sessionRepository,
        friendshipRepository,
        presenceRepository,
        unitOfWork,
        userEventsPublisher
    );
    const generate2FAUseCase = new Generate2FAUseCaseImpl(userRepository, twoFAService);
    const enable2FAUseCase = new Enable2FAUseCaseImpl(userRepository, twoFAService);
    const disable2FAUseCase = new Disable2FAUseCaseImpl(userRepository, twoFAService);
    const oauth42LoginUseCase = new OAuth42LoginUseCaseImpl(oauth42Service, oauthStateManager);
    const oauth42CallbackUseCase = new OAuth42CallbackUseCaseImpl(
        oauth42Service,
        userRepository,
        sessionRepository,
        jwtService,
        oauthStateManager
    );
    const sendFriendRequestUseCase = new SendFriendRequestUseCase(friendshipRepository, userRepository);
    const respondFriendRequestUseCase = new RespondFriendRequestUseCase(friendshipRepository);
    const listFriendsUseCase = new ListFriendsUseCase(friendshipRepository, userRepository);
    const blockUserUseCase = new BlockUserUseCase(friendshipRepository, userRepository);
    const removeFriendUseCase = new RemoveFriendUseCase(friendshipRepository);
    const unblockUserUseCase = new UnblockUserUseCase(friendshipRepository);
    const cancelFriendRequestUseCase = new CancelFriendRequestUseCase(friendshipRepository);
    const updatePresenceUseCase = new UpdatePresenceUseCase(presenceRepository);
    const getPresenceUseCase = new GetPresenceUseCase(presenceRepository);

    // Initialize controllers
    const authController = new AuthController(
        signupUseCase,
        loginUseCase,
        logoutUseCase,
        refreshTokenUseCase,
        getUserUseCase,
        oauth42LoginUseCase,
        oauth42CallbackUseCase,
        generate2FAUseCase,
        enable2FAUseCase,
        disable2FAUseCase
    );
    const userController = new UserController(updateProfileUseCase, getUserUseCase, deleteUserUseCase);
    const friendController = new FriendController(
        sendFriendRequestUseCase,
        respondFriendRequestUseCase,
        listFriendsUseCase,
        blockUserUseCase,
        removeFriendUseCase,
        unblockUserUseCase,
        cancelFriendRequestUseCase
    );
    const presenceController = new PresenceController(updatePresenceUseCase, getPresenceUseCase);

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
            vault: jwtService.isUsingVault() ? 'connected' : 'fallback',
        };
    });

    // Register routes
    registerAuthRoutes(fastify, authController);
    registerUserRoutes(fastify, userController);
    registerFriendRoutes(fastify, friendController);
    registerPresenceRoutes(fastify, presenceController);

    // Graceful shutdown
    const shutdown = async () => {
        fastify.log.info('Shutting down...');
        await jwtService.shutdown();
        await messagingConnection.close();
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
