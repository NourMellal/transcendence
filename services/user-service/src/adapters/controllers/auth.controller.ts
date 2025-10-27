import { FastifyRequest, FastifyReply } from 'fastify';
import { 
    OAuth42LoginUseCase, 
    OAuth42CallbackUseCase, 
    AuthenticateUserUseCase,
    Verify2FAUseCase
} from '../../domain/ports.js';
import { parseCookies, serializeCookie, clearCookie } from '../../utils/cookie-parser';

export class AuthController {
    constructor(
        private readonly oauth42LoginUseCase: OAuth42LoginUseCase,
        private readonly oauth42CallbackUseCase: OAuth42CallbackUseCase,
        private readonly authenticateUserUseCase: AuthenticateUserUseCase,
        private readonly verify2FAUseCase: Verify2FAUseCase
    ) {}

    /**
     * GET /auth/42/login - Initiate 42 OAuth login
     */
    async start42Login(req: FastifyRequest, reply: FastifyReply): Promise<void> {
        try {
            const authUrl = await this.oauth42LoginUseCase.execute();
            reply.redirect(302, authUrl);
        } catch (error) {
            req.log.error({ error }, 'OAuth login failed');
            reply.status(500).send({ error: 'Authentication service unavailable' });
        }
    }

    /**
     * GET /auth/42/callback - Handle 42 OAuth callback
     */
    async handle42Callback(req: FastifyRequest, reply: FastifyReply): Promise<void> {
        const { code, state } = req.query as { code?: string; state?: string };

        if (!code) {
            reply.status(400).send({ error: 'Missing authorization code' });
            return;
        }

        try {
            const { user, sessionToken: jwtToken } = await this.oauth42CallbackUseCase.execute(code, state || '');

            // Manually set JWT cookie using Set-Cookie header
            const cookieValue = serializeCookie('token', jwtToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 24 * 60 * 60, // 24 hours in seconds
                path: '/'
            });

            reply.header('Set-Cookie', cookieValue);
            reply.redirect(302, process.env.FRONTEND_URL || 'http://localhost:3000');

        } catch (error) {
            req.log.error({ error }, 'OAuth callback failed');
            reply.status(401).send({ error: 'Authentication failed' });
        }
    }

    /**
     * GET /auth/status - Get current authentication status
     */
    async getStatus(req: FastifyRequest, reply: FastifyReply): Promise<void> {
        // Manually parse cookies from Cookie header
        const cookies = parseCookies(req.headers.cookie);
        const jwtToken = cookies.token;

        if (!jwtToken) {
            reply.status(401).send({ error: 'Not authenticated' });
            return;
        }

        try {
            const user = await this.authenticateUserUseCase.execute(jwtToken);

            if (!user) {
                reply.status(401).send({ error: 'Invalid or expired token' });
                return;
            }

            reply.send({
                id: user.id,
                email: user.email,
                username: user.username,
                avatar: user.avatar,
                is2FAEnabled: user.is2FAEnabled,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            });

        } catch (error) {
            req.log.error({ error }, 'Auth status check failed');
            reply.status(500).send({ error: 'Internal server error' });
        }
    }

    /**
     * POST /auth/logout - Log out current user
     */
    async logout(req: FastifyRequest, reply: FastifyReply): Promise<void> {
        // Clear the JWT cookie by setting it to expire immediately
        const cookieValue = clearCookie('token', { path: '/' });
        
        reply.header('Set-Cookie', cookieValue);
        reply.status(204).send();
    }

    /**
     * POST /auth/verify-2fa - Verify 2FA token during login
     */
    async verify2FA(req: FastifyRequest, reply: FastifyReply): Promise<void> {
        const { token } = req.body as { token: string };
        
        // Manually parse cookies
        const cookies = parseCookies(req.headers.cookie);
        const jwtToken = cookies.token;

        if (!jwtToken) {
            reply.status(401).send({ error: 'Not authenticated' });
            return;
        }

        if (!token) {
            reply.status(400).send({ error: 'Token is required' });
            return;
        }

        try {
            const user = await this.authenticateUserUseCase.execute(jwtToken);
            if (!user) {
                reply.status(401).send({ error: 'Invalid or expired token' });
                return;
            }

            const isValid = await this.verify2FAUseCase.execute(user.id, token);
            
            if (isValid) {
                reply.send({ valid: true, message: '2FA verification successful' });
            } else {
                reply.status(400).send({ error: 'Invalid 2FA token' });
            }

        } catch (error) {
            req.log.error({ error }, '2FA verification failed');
            reply.status(500).send({ error: 'Internal server error' });
        }
    }
}