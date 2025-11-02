import type { FastifyReply, FastifyRequest } from 'fastify';
import { SignupUseCase } from '../../../application/use-cases/signup.usecase.js';
import { LoginUseCase } from '../../../application/use-cases/login.usecase.js';
import { LogoutUseCase } from '../../../application/use-cases/logout.usecase.js';
import { GetUserUseCase } from '../../../application/use-cases/get-user.usecase.js';
import { SignupRequestDTO, LoginRequestDTO } from '../../../application/dto/auth.dto.js';

export class AuthController {
    constructor(
        private signupUseCase: SignupUseCase,
        private loginUseCase: LoginUseCase,
        private logoutUseCase: LogoutUseCase,
        private getUserUseCase: GetUserUseCase
    ) { }

    async signup(
        request: FastifyRequest<{ Body: SignupRequestDTO }>,
        reply: FastifyReply
    ): Promise<void> {
        try {
            const user = await this.signupUseCase.execute(request.body);

            reply.code(201).send({
                id: user.id,
                email: user.email,
                username: user.username,
                displayName: user.displayName,
                avatar: user.avatar,
                is2FAEnabled: user.is2FAEnabled,
                createdAt: user.createdAt,
            });
        } catch (error: any) {
            if (error.message.includes('already exists')) {
                reply.code(409).send({
                    error: 'Conflict',
                    message: error.message
                });
            } else if (
                error.message.includes('required') ||
                error.message.includes('Invalid') ||
                error.message.includes('must be')
            ) {
                reply.code(400).send({
                    error: 'Bad Request',
                    message: error.message
                });
            } else {
                request.log.error(error);
                reply.code(500).send({
                    error: 'Internal Server Error',
                    message: 'An error occurred during signup'
                });
            }
        }
    }

    async login(
        request: FastifyRequest<{ Body: LoginRequestDTO }>,
        reply: FastifyReply
    ): Promise<void> {
        try {
            const result = await this.loginUseCase.execute(request.body);

            reply.code(200).send({
                user: {
                    id: result.user.id,
                    email: result.user.email,
                    username: result.user.username,
                    displayName: result.user.displayName,
                    avatar: result.user.avatar,
                    is2FAEnabled: result.user.is2FAEnabled,
                },
                accessToken: result.accessToken,
                message: 'Login successful',
            });
        } catch (error: any) {
            // Log full error for debugging
            request.log.error({ err: error }, 'Login failed');

            if (error.message.includes('credentials') || error.message.includes('OAuth')) {
                reply.code(401).send({
                    error: 'Unauthorized',
                    message: error.message
                });
            } else if (error.message.includes('required') || error.message.includes('JWT configuration')) {
                reply.code(400).send({
                    error: 'Bad Request',
                    message: error.message
                });
            } else {
                reply.code(500).send({
                    error: 'Internal Server Error',
                    message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred during login'
                });
            }
        }
    }

    async status(
        request: FastifyRequest,
        reply: FastifyReply
    ): Promise<void> {
        try {
            // Prefer x-user-id header (set by API Gateway). Fallback: Authorization token verification is handled by gateway.
            const userId = request.headers['x-user-id'] as string;

            if (!userId) {
                return reply.code(401).send({
                    error: 'Unauthorized',
                    message: 'User not authenticated'
                });
            }

            const user = await this.getUserUseCase.execute(userId);

            if (!user) {
                return reply.code(404).send({
                    error: 'Not Found',
                    message: 'User not found'
                });
            }

            return reply.code(200).send({
                authenticated: true,
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    displayName: user.displayName,
                }
            });
        } catch (error: any) {
            request.log.error({ err: error }, 'Auth status failed');
            return reply.code(500).send({
                error: 'Internal Server Error',
                message: 'Failed to get auth status'
            });
        }
    }

    async logout(
        request: FastifyRequest,
        reply: FastifyReply
    ): Promise<void> {
        try {
            const userId = request.headers['x-user-id'] as string;

            if (!userId) {
                return reply.code(401).send({
                    error: 'Unauthorized',
                    message: 'User not authenticated'
                });
            }

            const result = await this.logoutUseCase.execute(userId);
            return reply.code(200).send(result);
        } catch (error: any) {
            request.log.error({ err: error }, 'Logout failed');
            if (error.message.includes('not found')) {
                return reply.code(404).send({ error: 'Not Found', message: error.message });
            }
            return reply.code(500).send({ error: 'Internal Server Error', message: 'Failed to logout' });
        }
    }
}
