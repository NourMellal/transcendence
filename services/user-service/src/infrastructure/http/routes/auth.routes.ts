import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuthController } from '../controllers/auth.controller.js';
import { validateInternalApiKey } from '../middlewares/internal-api.middleware.js';
import { SignupRequestDTO, LoginRequestDTO } from '../../../application/dto/auth.dto.js';

export function registerAuthRoutes(
    fastify: FastifyInstance,
    authController: AuthController
) {
    // POST /auth/signup - Register new user
    fastify.post<{ Body: SignupRequestDTO }>('/auth/signup', {
        preHandler: [validateInternalApiKey]
    }, async (request: FastifyRequest<{ Body: SignupRequestDTO }>, reply: FastifyReply) => {
        return authController.signup(request, reply);
    });

    // POST /auth/login - Login with email/password
    fastify.post<{ Body: LoginRequestDTO }>('/auth/login', {
        preHandler: [validateInternalApiKey]
    }, async (request: FastifyRequest<{ Body: LoginRequestDTO }>, reply: FastifyReply) => {
        return authController.login(request, reply);
    });

    // GET /auth/status - Check authentication status (expects x-user-id header from gateway)
    fastify.get('/auth/status', {
        preHandler: [validateInternalApiKey]
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        return authController.status(request, reply);
    });

    // POST /auth/logout - Logout user (expects x-user-id header)
    fastify.post('/auth/logout', {
        preHandler: [validateInternalApiKey]
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        return authController.logout(request, reply);
    });

    fastify.log.info('✅ Auth routes registered');
}
