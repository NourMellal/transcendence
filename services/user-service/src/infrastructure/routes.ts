import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuthController } from '../adapters/controllers/auth.controller.js';
import { UserController } from '../adapters/controllers/user-management.controller.js';

// Types for authenticated requests
interface RequestWithUser extends FastifyRequest {
    user?: {
        id: string;
        email: string;
        username: string;
    };
}

interface RequestWithCookies extends FastifyRequest {
    cookies: {
        token?: string;
        [key: string]: string | undefined;
    };
}

export function setupRoutes(
    fastify: FastifyInstance,
    authController: AuthController,
    userController: UserController
) {
    // Authentication routes (public)
    fastify.get('/auth/42/login', async (req: FastifyRequest, reply: FastifyReply) => {
        return authController.start42Login(req, reply);
    });

    fastify.get('/auth/42/callback', async (req: FastifyRequest, reply: FastifyReply) => {
        return authController.handle42Callback(req as RequestWithCookies, reply as any);
    });

    fastify.get('/auth/status', async (req: FastifyRequest, reply: FastifyReply) => {
        return authController.getStatus(req as RequestWithCookies, reply);
    });

    fastify.post('/auth/logout', async (req: FastifyRequest, reply: FastifyReply) => {
        return authController.logout(req as RequestWithCookies, reply as any);
    });

    fastify.post('/auth/verify-2fa', async (req: FastifyRequest, reply: FastifyReply) => {
        return authController.verify2FA(req as RequestWithCookies, reply);
    });

    // User management routes (protected - requires authentication)
    fastify.register(async function (protectedRoutes) {
        // Authentication middleware for all routes in this context
        protectedRoutes.addHook('preHandler', async (req: FastifyRequest, reply: FastifyReply) => {
            // Authenticate and attach user to request
            return userController.authenticateUser(req as RequestWithCookies, reply);
        });

        // User profile endpoints
        protectedRoutes.get('/api/users/me', async (req: FastifyRequest, reply: FastifyReply) => {
            return userController.getProfile(req as RequestWithUser, reply);
        });

        protectedRoutes.put('/api/users/me', async (req: FastifyRequest, reply: FastifyReply) => {
            return userController.updateProfile(req as RequestWithUser, reply);
        });

        // 2FA management endpoints
        protectedRoutes.post('/api/users/me/2fa/generate', async (req: FastifyRequest, reply: FastifyReply) => {
            return userController.generate2FA(req as RequestWithUser, reply);
        });

        protectedRoutes.post('/api/users/me/2fa/enable', async (req: FastifyRequest, reply: FastifyReply) => {
            return userController.enable2FA(req as RequestWithUser, reply);
        });

        protectedRoutes.post('/api/users/me/2fa/disable', async (req: FastifyRequest, reply: FastifyReply) => {
            return userController.disable2FA(req as RequestWithUser, reply);
        });
    });
}