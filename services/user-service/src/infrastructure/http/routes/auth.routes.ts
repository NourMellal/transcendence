import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuthController } from '../controllers/auth.controller';
import { validateInternalApiKey } from '../middlewares/internal-api.middleware';
import { SignupRequestDTO, LoginRequestDTO, Enable2FARequestDTO, Disable2FARequestDTO, RefreshTokenRequestDTO } from '../../../application/dto/auth.dto';

export function registerAuthRoutes(
    fastify: FastifyInstance,
    authController: AuthController
) {
    // GET /auth/42/login - Start OAuth flow
    fastify.get('/auth/42/login', {
        preHandler: [validateInternalApiKey]
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        return authController.oauth42Login(request, reply);
    });

    // GET /auth/42/callback - Handle OAuth callback
    fastify.get('/auth/42/callback', {
        preHandler: [validateInternalApiKey]
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        return authController.oauth42Callback(request as FastifyRequest<{ Querystring: { code?: string; state?: string; } }>, reply);
    });

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
    fastify.post<{ Body: { refreshToken?: string } }>('/auth/logout', {
        preHandler: [validateInternalApiKey]
    }, async (request: FastifyRequest<{ Body: { refreshToken?: string } }>, reply: FastifyReply) => {
        return authController.logout(request, reply);
    });

    // POST /auth/refresh - Refresh access token
    fastify.post<{ Body: RefreshTokenRequestDTO }>('/auth/refresh', {
        preHandler: [validateInternalApiKey]
    }, async (
        request: FastifyRequest<{ Body: RefreshTokenRequestDTO }>,
        reply: FastifyReply
    ) => {
        return authController.refresh(request, reply);
    });

    // POST /auth/2fa/generate - Generate 2FA secret
    fastify.post('/auth/2fa/generate', {
        preHandler: [validateInternalApiKey]
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        return authController.generate2FA(request, reply);
    });

    // POST /auth/2fa/enable - Enable 2FA
    fastify.post<{ Body: Enable2FARequestDTO }>('/auth/2fa/enable', {
        preHandler: [validateInternalApiKey]
    }, async (request: FastifyRequest<{ Body: Enable2FARequestDTO }>, reply: FastifyReply) => {
        return authController.enable2FA(request, reply);
    });

    // POST /auth/2fa/disable - Disable 2FA
    fastify.post<{ Body: Disable2FARequestDTO }>('/auth/2fa/disable', {
        preHandler: [validateInternalApiKey]
    }, async (request: FastifyRequest<{ Body: Disable2FARequestDTO }>, reply: FastifyReply) => {
        return authController.disable2FA(request, reply);
    });

    fastify.log.info('✅ Auth routes registered');
}
