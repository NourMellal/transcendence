import type { FastifyReply, FastifyRequest } from 'fastify';
import { SignupUseCase } from '../../../application/use-cases/signup.usecase.js';
import { LoginUseCase } from '../../../application/use-cases/login.usecase.js';

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

export class AuthController {
    constructor(
        private signupUseCase: SignupUseCase,
        private loginUseCase: LoginUseCase
    ) { }

    async signup(
        request: FastifyRequest<{ Body: SignupBody }>,
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
        request: FastifyRequest<{ Body: LoginBody }>,
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
}
