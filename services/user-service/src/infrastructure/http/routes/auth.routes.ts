import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuthController } from '../controllers/auth.controller.js';
import { validateInternalApiKey } from '../middlewares/internal-api.middleware.js';

interface SignupBody {
    email: string;
    username: string;
    password: string;
    displayName?: string;
}

interface LoginBody {
    email: string;
    password: string;
}

export function registerAuthRoutes(
    fastify: FastifyInstance,
    authController: AuthController
) {
    // POST /auth/signup - Register new user
    fastify.post<{ Body: SignupBody }>('/auth/signup', {
        preHandler: [validateInternalApiKey]
    }, async (request: FastifyRequest<{ Body: SignupBody }>, reply: FastifyReply) => {
        return authController.signup(request, reply);
    });

    // POST /auth/login - Login with email/password
    fastify.post<{ Body: LoginBody }>('/auth/login', {
        preHandler: [validateInternalApiKey]
    }, async (request: FastifyRequest<{ Body: LoginBody }>, reply: FastifyReply) => {
        return authController.login(request, reply);
    });

    fastify.log.info('✅ Auth routes registered');
}
