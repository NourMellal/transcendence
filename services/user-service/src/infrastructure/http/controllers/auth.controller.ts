import type { FastifyReply, FastifyRequest } from 'fastify';
import { SignupUseCase } from '../../../application/use-cases/signup.usecase.js';
import { LoginUseCase } from '../../../application/use-cases/login.usecase.js';
import { LogoutUseCase } from '../../../application/use-cases/logout.usecase.js';
import { GetUserUseCase } from '../../../application/use-cases/get-user.usecase.js';
import { AuthMapper } from '../../../application/mappers/auth.mapper.js';
import {
    SignupRequestDTO,
    LoginRequestDTO,
    Enable2FARequestDTO,
    Disable2FARequestDTO
} from '../../../application/dto/auth.dto.js';
import type {
    Disable2FAUseCase,
    Enable2FAUseCase,
    Generate2FAUseCase,
    OAuth42CallbackUseCase,
    OAuth42LoginUseCase
} from '../../../domain/ports.js';

type OAuthCallbackQuery = {
    code?: string;
    state?: string;
};

export class AuthController {
    private readonly successRedirect =
        process.env.OAUTH_42_SUCCESS_REDIRECT ||
        'http://localhost:5173/oauth/callback';

    private readonly failureRedirect =
        process.env.OAUTH_42_FAILURE_REDIRECT ||
        'http://localhost:5173/oauth/error';

    constructor(
        private readonly signupUseCase: SignupUseCase,
        private readonly loginUseCase: LoginUseCase,
        private readonly logoutUseCase: LogoutUseCase,
        private readonly getUserUseCase: GetUserUseCase,
        private readonly oauth42LoginUseCase: OAuth42LoginUseCase,
        private readonly oauth42CallbackUseCase: OAuth42CallbackUseCase,
        private readonly generate2FAUseCase: Generate2FAUseCase,
        private readonly enable2FAUseCase: Enable2FAUseCase,
        private readonly disable2FAUseCase: Disable2FAUseCase,
    ) { }

    async signup(
        request: FastifyRequest<{ Body: SignupRequestDTO }>,
        reply: FastifyReply
    ): Promise<void> {
        try {
            const user = await this.signupUseCase.execute(request.body);
            reply.code(201).send(AuthMapper.toSignupResponseDTO(user));
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
            reply.code(200).send(AuthMapper.toLoginResponseDTO(result.user, result.accessToken));
        } catch (error: any) {
            request.log.error({ err: error }, 'Login failed');
            const message = error.message || '';

            if (
                message.includes('credentials') ||
                message.includes('OAuth') ||
                message.includes('2FA') ||
                message.includes('Two-factor')
            ) {
                reply.code(401).send({
                    error: 'Unauthorized',
                    message
                });
            } else if (message.includes('required') || message.includes('JWT configuration')) {
                reply.code(400).send({
                    error: 'Bad Request',
                    message
                });
            } else {
                reply.code(500).send({
                    error: 'Internal Server Error',
                    message: process.env.NODE_ENV === 'development' ? message : 'An error occurred during login'
                });
            }
        }
    }

    async status(
        request: FastifyRequest,
        reply: FastifyReply
    ): Promise<void> {
        try {
            const userId = request.headers['x-user-id'] as string;

            if (!userId) {
                reply.code(401).send({
                    error: 'Unauthorized',
                    message: 'User not authenticated'
                });
                return;
            }

            const user = await this.getUserUseCase.execute(userId);

            if (!user) {
                reply.code(404).send({
                    error: 'Not Found',
                    message: 'User not found'
                });
                return;
            }

            reply.code(200).send({
                authenticated: true,
                user: AuthMapper.toUserInfoDTO(user)
            });
        } catch (error: any) {
            request.log.error({ err: error }, 'Auth status failed');
            reply.code(500).send({
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
                reply.code(401).send({
                    error: 'Unauthorized',
                    message: 'User not authenticated'
                });
                return;
            }

            const result = await this.logoutUseCase.execute(userId);
            reply.code(200).send(result);
        } catch (error: any) {
            request.log.error({ err: error }, 'Logout failed');
            if (error.message.includes('not found')) {
                reply.code(404).send({ error: 'Not Found', message: error.message });
                return;
            }
            reply.code(500).send({ error: 'Internal Server Error', message: 'Failed to logout' });
        }
    }

    async oauth42Login(
        _request: FastifyRequest,
        reply: FastifyReply
    ): Promise<void> {
        try {
            const authorizationUrl = await this.oauth42LoginUseCase.execute();
            reply.redirect(authorizationUrl);
        } catch (error: any) {
            reply.code(500).send({
                error: 'Internal Server Error',
                message: error.message || 'Failed to start OAuth flow'
            });
        }
    }

    async oauth42Callback(
        request: FastifyRequest<{ Querystring: OAuthCallbackQuery }>,
        reply: FastifyReply
    ): Promise<void> {
        const { code, state } = request.query || {};

        if (!code || !state) {
            reply.redirect(this.buildFailureRedirect('missing_code'));
            return;
        }

        try {
            const { sessionToken, user } = await this.oauth42CallbackUseCase.execute(code, state);
            reply.redirect(this.buildSuccessRedirect(sessionToken, user.id));
        } catch (error: any) {
            request.log.error({ err: error }, 'OAuth 42 callback failed');
            reply.redirect(this.buildFailureRedirect('oauth_error'));
        }
    }

    async generate2FA(
        request: FastifyRequest,
        reply: FastifyReply
    ): Promise<void> {
        const userId = request.headers['x-user-id'] as string;

        if (!userId) {
            reply.code(401).send({
                error: 'Unauthorized',
                message: 'User not authenticated'
            });
            return;
        }

        try {
            const result = await this.generate2FAUseCase.execute(userId);
            reply.code(200).send({
                secret: result.secret,
                qrCode: result.qrCode,
            });
        } catch (error: any) {
            request.log.error({ err: error }, 'Generate 2FA failed');
            reply.code(500).send({
                error: 'Internal Server Error',
                message: error.message || 'Failed to generate 2FA secret'
            });
        }
    }

    async enable2FA(
        request: FastifyRequest<{ Body: Enable2FARequestDTO }>,
        reply: FastifyReply
    ): Promise<void> {
        const userId = request.headers['x-user-id'] as string;

        if (!userId) {
            reply.code(401).send({
                error: 'Unauthorized',
                message: 'User not authenticated'
            });
            return;
        }

        if (!request.body?.token) {
            reply.code(400).send({
                error: 'Bad Request',
                message: '2FA token is required'
            });
            return;
        }

        try {
            await this.enable2FAUseCase.execute(userId, request.body.token);
            reply.code(200).send({ message: 'Two-factor authentication enabled' });
        } catch (error: any) {
            request.log.error({ err: error }, 'Enable 2FA failed');
            if (error.message.includes('Invalid 2FA token')) {
                reply.code(400).send({
                    error: 'Bad Request',
                    message: error.message
                });
                return;
            }
            reply.code(500).send({
                error: 'Internal Server Error',
                message: error.message || 'Failed to enable 2FA'
            });
        }
    }

    async disable2FA(
        request: FastifyRequest<{ Body: Disable2FARequestDTO }>,
        reply: FastifyReply
    ): Promise<void> {
        const userId = request.headers['x-user-id'] as string;

        if (!userId) {
            reply.code(401).send({
                error: 'Unauthorized',
                message: 'User not authenticated'
            });
            return;
        }

        if (!request.body?.token) {
            reply.code(400).send({
                error: 'Bad Request',
                message: '2FA token is required'
            });
            return;
        }

        try {
            await this.disable2FAUseCase.execute(userId, request.body.token);
            reply.code(200).send({ message: 'Two-factor authentication disabled' });
        } catch (error: any) {
            request.log.error({ err: error }, 'Disable 2FA failed');
            if (error.message.includes('Invalid 2FA token') || error.message.includes('not enabled')) {
                reply.code(400).send({
                    error: 'Bad Request',
                    message: error.message
                });
                return;
            }
            reply.code(500).send({
                error: 'Internal Server Error',
                message: error.message || 'Failed to disable 2FA'
            });
        }
    }

    private buildSuccessRedirect(token: string, userId: string): string {
        const url = new URL(this.successRedirect);
        url.searchParams.set('token', token);
        url.searchParams.set('userId', userId);
        url.searchParams.set('provider', '42');
        return url.toString();
    }

    private buildFailureRedirect(reason: string): string {
        const url = new URL(this.failureRedirect);
        url.searchParams.set('error', reason);
        return url.toString();
    }
}
